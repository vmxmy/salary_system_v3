/**
 * 认证服务
 * 
 * 基于Supabase Auth的认证服务
 * 提供登录、注册、权限检查等功能
 */

import { supabase, getCurrentUser, getSession } from '../supabase/client';
import { ForbiddenError, UnauthorizedError } from '../../core/errors';

/**
 * 角色层级定义
 */
export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN', 
    HR_MANAGER = 'HR_MANAGER',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE'
}

/**
 * 角色权重（用于权限比较）
 */
const ROLE_WEIGHTS: Record<Role, number> = {
    [Role.SUPER_ADMIN]: 5,
    [Role.ADMIN]: 4,
    [Role.HR_MANAGER]: 3,
    [Role.MANAGER]: 2,
    [Role.EMPLOYEE]: 1
};

/**
 * 用户信息
 */
export interface UserInfo {
    id: string;
    email: string;
    employeeId?: string;
    role: Role;
    permissions: string[];
    departmentId?: string;
    metadata?: Record<string, any>;
}

/**
 * 认证服务类
 */
export class AuthService {
    private static instance: AuthService;
    private currentUser: UserInfo | null = null;
    
    private constructor() {}
    
    static getInstance(): AuthService {
        if (!this.instance) {
            this.instance = new AuthService();
        }
        return this.instance;
    }
    
    /**
     * 用户登录
     */
    async login(email: string, password: string): Promise<UserInfo> {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            throw new UnauthorizedError('登录失败：' + error.message);
        }
        
        // 获取用户详细信息
        const userInfo = await this.getUserInfo(data.user.id);
        this.currentUser = userInfo;
        
        return userInfo;
    }
    
    /**
     * 用户注销
     */
    async logout(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw new Error('注销失败：' + error.message);
        }
        
        this.currentUser = null;
    }
    
    /**
     * 获取当前用户信息
     */
    async getCurrentUserInfo(): Promise<UserInfo> {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        const user = await getCurrentUser();
        if (!user) {
            throw new UnauthorizedError('用户未登录');
        }
        
        const userInfo = await this.getUserInfo(user.id);
        this.currentUser = userInfo;
        
        return userInfo;
    }
    
    /**
     * 检查权限
     */
    async checkPermission(requiredRole: Role): Promise<void> {
        const userInfo = await this.getCurrentUserInfo();
        
        if (!this.hasRole(userInfo.role, requiredRole)) {
            throw new ForbiddenError(`需要${requiredRole}权限`);
        }
    }
    
    /**
     * 检查特定权限
     */
    async checkSpecificPermission(permission: string): Promise<void> {
        const userInfo = await this.getCurrentUserInfo();
        
        if (!userInfo.permissions.includes(permission)) {
            throw new ForbiddenError(`缺少权限：${permission}`);
        }
    }
    
    /**
     * 检查部门权限
     */
    async checkDepartmentAccess(departmentId: string): Promise<void> {
        const userInfo = await this.getCurrentUserInfo();
        
        // 超级管理员和管理员可以访问所有部门
        if (this.hasRole(userInfo.role, Role.ADMIN)) {
            return;
        }
        
        // HR经理可以访问所有部门
        if (userInfo.role === Role.HR_MANAGER) {
            return;
        }
        
        // 部门经理只能访问自己的部门
        if (userInfo.role === Role.MANAGER) {
            const { data: managedDepts } = await supabase
                .from('departments')
                .select('id')
                .eq('manager_id', userInfo.employeeId);
            
            const deptIds = managedDepts?.map(d => d.id) || [];
            if (!deptIds.includes(departmentId)) {
                throw new ForbiddenError('无权访问该部门');
            }
        }
        
        // 普通员工只能访问自己的部门
        if (userInfo.departmentId !== departmentId) {
            throw new ForbiddenError('无权访问该部门');
        }
    }
    
    /**
     * 获取用户详细信息
     */
    private async getUserInfo(userId: string): Promise<UserInfo> {
        // 获取用户角色
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role, employee_id')
            .eq('user_id', userId)
            .single();
        
        if (!roleData) {
            throw new Error('用户角色信息不存在');
        }
        
        // 获取用户权限
        const { data: permissions } = await supabase
            .from('user_permissions')
            .select('permission')
            .eq('user_id', userId);
        
        // 获取员工信息
        let departmentId: string | undefined;
        if (roleData.employee_id) {
            const { data: employee } = await supabase
                .from('employees')
                .select('department_id')
                .eq('id', roleData.employee_id)
                .single();
            
            departmentId = employee?.department_id;
        }
        
        // 获取用户邮箱
        const user = await getCurrentUser();
        
        return {
            id: userId,
            email: user?.email || '',
            employeeId: roleData.employee_id,
            role: roleData.role as Role,
            permissions: permissions?.map(p => p.permission) || [],
            departmentId
        };
    }
    
    /**
     * 判断角色权限
     */
    private hasRole(userRole: Role, requiredRole: Role): boolean {
        return ROLE_WEIGHTS[userRole] >= ROLE_WEIGHTS[requiredRole];
    }
    
    /**
     * 刷新用户信息
     */
    async refreshUserInfo(): Promise<void> {
        this.currentUser = null;
        await this.getCurrentUserInfo();
    }
    
    /**
     * 创建用户（管理员功能）
     */
    async createUser(
        email: string,
        password: string,
        role: Role,
        employeeId?: string
    ): Promise<string> {
        // 检查权限
        await this.checkPermission(Role.ADMIN);
        
        // 创建认证用户
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        
        if (authError) {
            throw new Error('创建用户失败：' + authError.message);
        }
        
        // 创建角色记录
        const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
                user_id: authData.user.id,
                role,
                employee_id: employeeId
            });
        
        if (roleError) {
            // 回滚：删除认证用户
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error('创建用户角色失败：' + roleError.message);
        }
        
        return authData.user.id;
    }
    
    /**
     * 更新用户角色
     */
    async updateUserRole(userId: string, newRole: Role): Promise<void> {
        // 检查权限
        await this.checkPermission(Role.ADMIN);
        
        const { error } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', userId);
        
        if (error) {
            throw new Error('更新用户角色失败：' + error.message);
        }
    }
    
    /**
     * 禁用用户
     */
    async disableUser(userId: string): Promise<void> {
        // 检查权限
        await this.checkPermission(Role.ADMIN);
        
        const { error } = await supabase.auth.admin.updateUserById(
            userId,
            { ban_duration: '876600h' } // 100年
        );
        
        if (error) {
            throw new Error('禁用用户失败：' + error.message);
        }
    }
    
    /**
     * 启用用户
     */
    async enableUser(userId: string): Promise<void> {
        // 检查权限
        await this.checkPermission(Role.ADMIN);
        
        const { error } = await supabase.auth.admin.updateUserById(
            userId,
            { ban_duration: 'none' }
        );
        
        if (error) {
            throw new Error('启用用户失败：' + error.message);
        }
    }
}

// 导出单例
export const authService = AuthService.getInstance();