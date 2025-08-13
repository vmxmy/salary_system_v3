/**
 * 认证 Hook
 * 
 * 基于 Supabase Auth 的认证管理
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { toast } from 'sonner'

// 用户角色
export type UserRole = 'super_admin' | 'admin' | 'hr_manager' | 'manager' | 'employee'

// 用户信息扩展
export interface UserProfile {
  id: string
  email: string
  role: UserRole
  employeeId?: string
  employeeName?: string
  departmentId?: string
  departmentName?: string
  permissions: string[]
}

// Auth Store
interface AuthStore {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ user: null, session: null, profile: null })
}))

/**
 * 认证 Hook
 */
export function useAuth() {
  const navigate = useNavigate()
  const { user, session, profile, loading, setUser, setSession, setProfile, setLoading, clear } = useAuthStore()

  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        clear()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 加载用户配置文件
  const loadUserProfile = async (userId: string) => {
    try {
      // 获取用户角色
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, employee_id')
        .eq('user_id', userId)
        .single()

      if (!roleData) {
        throw new Error('用户角色未配置')
      }

      // 获取员工信息
      let employeeInfo = null
      if (roleData.employee_id) {
        const { data: employee } = await supabase
          .from('employees')
          .select('employee_name')
          .eq('id', roleData.employee_id)
          .single()
        
        employeeInfo = employee
      }

      // 获取部门信息
      let departmentInfo = null
      if (roleData.employee_id) {
        const { data: assignment } = await supabase
          .from('employee_assignments')
          .select('department:departments(id, name)')
          .eq('employee_id', roleData.employee_id)
          .eq('is_active', true)
          .single()
        
        departmentInfo = assignment?.department
      }

      // 获取权限列表
      const { data: permissions } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', roleData.role)

      const profile: UserProfile = {
        id: userId,
        email: user?.email || '',
        role: roleData.role as UserRole,
        employeeId: roleData.employee_id,
        employeeName: employeeInfo?.employee_name,
        departmentId: departmentInfo?.id,
        departmentName: departmentInfo?.name,
        permissions: permissions?.map(p => p.permission) || []
      }

      setProfile(profile)
    } catch (error) {
      console.error('Failed to load user profile:', error)
      toast.error('加载用户信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 登录
  const signIn = async (email: string, password: string) => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success('登录成功')
      navigate('/dashboard')
      return data
    } catch (error: any) {
      toast.error(`登录失败: ${error.message}`)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // 登出
  const signOut = async () => {
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      clear()
      toast.success('已退出登录')
      navigate('/login')
    } catch (error: any) {
      toast.error(`退出失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 重置密码
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      toast.error(`重置密码失败: ${error.message}`)
      throw error
    }

    toast.success('密码重置邮件已发送')
  }

  // 更新密码
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast.error(`更新密码失败: ${error.message}`)
      throw error
    }

    toast.success('密码更新成功')
  }

  // 权限检查
  const hasPermission = (permission: string): boolean => {
    return profile?.permissions.includes(permission) || false
  }

  // 角色检查
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!profile) return false
    
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(profile.role)
  }

  // 角色权重比较
  const hasMinRole = (minRole: UserRole): boolean => {
    if (!profile) return false
    
    const roleWeights: Record<UserRole, number> = {
      super_admin: 5,
      admin: 4,
      hr_manager: 3,
      manager: 2,
      employee: 1
    }
    
    return roleWeights[profile.role] >= roleWeights[minRole]
  }

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    hasPermission,
    hasRole,
    hasMinRole
  }
}

/**
 * 需要认证的路由守卫
 */
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo)
    }
  }, [isAuthenticated, loading, navigate, redirectTo])

  return { isAuthenticated, loading }
}

/**
 * 权限守卫
 */
export function useRequirePermission(permission: string, redirectTo = '/403') {
  const { hasPermission, loading } = useAuth()
  const navigate = useNavigate()
  const hasAccess = hasPermission(permission)

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate(redirectTo)
    }
  }, [hasAccess, loading, navigate, redirectTo])

  return { hasAccess, loading }
}

/**
 * 角色守卫
 */
export function useRequireRole(role: UserRole | UserRole[], redirectTo = '/403') {
  const { hasRole, loading } = useAuth()
  const navigate = useNavigate()
  const hasAccess = hasRole(role)

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate(redirectTo)
    }
  }, [hasAccess, loading, navigate, redirectTo])

  return { hasAccess, loading }
}