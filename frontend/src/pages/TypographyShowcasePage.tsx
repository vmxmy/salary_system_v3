import { cn } from '@/lib/utils';

export default function TypographyShowcasePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Header */}
        <header className="text-center mb-16">
          <h1 className={cn("text-base", 'text-chinese-elegant mb-4')}>
            中文字体系统展示
          </h1>
          <p className={cn("text-base", 'text-chinese-modern text-base-content/70')}>
            优雅的衬线字体，传承经典之美
          </p>
        </header>

        {/* Display Typography */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            一、展示字体
          </h2>
          <div className="space-y-8 bg-base-100 p-8 rounded-2xl shadow-lg">
            <div className="space-y-2">
              <div className={cn("text-base", 'text-chinese-elegant')}>
                海内存知己，天涯若比邻
              </div>
              <p className="text-sm text-base-content/60">Display 1 - 楷体展示</p>
            </div>
            <div className="space-y-2">
              <div className={cn("text-base", 'text-chinese-elegant')}>
                山重水复疑无路，柳暗花明又一村
              </div>
              <p className="text-sm text-base-content/60">Display 2 - 楷体展示</p>
            </div>
          </div>
        </section>

        {/* Heading Typography */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            二、标题层级
          </h2>
          <div className="space-y-6 bg-base-100 p-8 rounded-2xl shadow-lg">
            <div>
              <h1 className={"text-base"}>壹级标题：薪资管理系统</h1>
              <p className="text-sm text-base-content/60 mt-1">H1 - 主标题使用楷体</p>
            </div>
            <div>
              <h2 className={"text-base"}>贰级标题：员工信息管理</h2>
              <p className="text-sm text-base-content/60 mt-1">H2 - 次级标题使用楷体</p>
            </div>
            <div>
              <h3 className={"text-base"}>叁级标题：基本信息录入</h3>
              <p className="text-sm text-base-content/60 mt-1">H3 - 章节标题使用宋体</p>
            </div>
            <div>
              <h4 className={"text-base"}>肆级标题：个人资料维护</h4>
              <p className="text-sm text-base-content/60 mt-1">H4 - 小节标题使用宋体</p>
            </div>
          </div>
        </section>

        {/* Body Typography */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            三、正文排版
          </h2>
          <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
            <div className="prose max-w-none">
              <p className={cn("text-base", 'text-chinese-modern mb-6')}>
                <span className="font-semibold">大号正文：</span>
                在现代企业管理中，薪资管理系统扮演着至关重要的角色。它不仅关系到员工的切身利益，
                更是企业人力资源管理的核心组成部分。一个优秀的薪资管理系统，应当具备准确性、
                及时性和保密性等特点，确保每一位员工的劳动成果得到公正的回报。
              </p>
              
              <p className={cn("text-base", 'text-chinese-modern mb-6')}>
                <span className="font-semibold">标准正文：</span>
                系统采用先进的数据加密技术，保障薪资信息的安全性。通过角色权限管理，
                不同级别的管理人员只能访问其职责范围内的数据。同时，系统提供完整的操作日志记录，
                确保所有数据变更都有据可查，维护了薪资管理的透明度和可追溯性。
              </p>
              
              <p className={cn("text-base", 'text-chinese-modern')}>
                <span className="font-semibold">小号正文：</span>
                注：本系统支持多种薪资结构配置，包括基本工资、绩效奖金、各类补贴和扣款项目。
                管理员可根据企业实际情况灵活设置薪资组成，满足不同岗位和部门的个性化需求。
              </p>
            </div>
          </div>
        </section>

        {/* Chinese Typography Styles */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            四、中文字体风格
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-base-100 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">传统风格</h3>
              <p className={"text-base"}>
                君子坦荡荡，小人长戚戚。
                学而时习之，不亦说乎？
                有朋自远方来，不亦乐乎？
              </p>
            </div>
            
            <div className="bg-base-100 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">现代风格</h3>
              <p className={"text-base"}>
                创新是企业发展的源泉，
                效率是管理追求的目标，
                和谐是团队前进的基石。
              </p>
            </div>
            
            <div className="bg-base-100 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-medium mb-4">典雅风格</h3>
              <p className={"text-base"}>
                静以修身，俭以养德。
                非淡泊无以明志，
                非宁静无以致远。
              </p>
            </div>
          </div>
        </section>

        {/* Mixed Content Example */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            五、中英文混排示例
          </h2>
          <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
            <article className="prose max-w-none">
              <h3 className={"text-base"}>
                Salary Management System 薪资管理系统
              </h3>
              <p className={cn("text-base", 'text-chinese-modern')}>
                本系统采用 React 18 和 TypeScript 构建，结合 Supabase 提供的 BaaS 服务，
                实现了高效、安全的薪资管理功能。系统支持 Role-Based Access Control (RBAC)，
                确保不同角色的用户只能访问其权限范围内的功能模块。
              </p>
              <p className={cn("text-base", 'text-chinese-modern')}>
                在技术架构上，我们使用了 TanStack Table 处理复杂的数据表格展示，
                配合 React Query 实现数据的缓存和同步。UI 层面采用 DaisyUI 组件库，
                并通过自定义的 Design Token 系统保证视觉的一致性。
              </p>
            </article>
          </div>
        </section>

        {/* Quote Example */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            六、引文展示
          </h2>
          <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
            <blockquote className={cn("text-base", 'border-l-4 border-primary pl-6')}>
              <p className="mb-4">
                "天行健，君子以自强不息；
                <br />
                地势坤，君子以厚德载物。"
              </p>
              <footer className="text-sm text-base-content/60">
                —— 《周易》
              </footer>
            </blockquote>
          </div>
        </section>

        {/* Typography Guidelines */}
        <section className="space-y-6">
          <h2 className={cn("text-base", 'text-chinese-traditional border-b border-base-300 pb-4')}>
            七、字体使用指南
          </h2>
          <div className="bg-base-100 p-8 rounded-2xl shadow-lg">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-primary font-bold">1.</span>
                <div>
                  <h4 className="font-medium mb-1">标题使用楷体系列</h4>
                  <p className="text-sm text-base-content/70">
                    楷体具有浓厚的中国传统文化气息，适合用于标题和强调性文字
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <span className="text-primary font-bold">2.</span>
                <div>
                  <h4 className="font-medium mb-1">正文使用宋体系列</h4>
                  <p className="text-sm text-base-content/70">
                    宋体清晰易读，适合长篇幅的正文内容，保证良好的阅读体验
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <span className="text-primary font-bold">3.</span>
                <div>
                  <h4 className="font-medium mb-1">UI元素使用无衬线字体</h4>
                  <p className="text-sm text-base-content/70">
                    按钮、输入框等界面元素使用系统无衬线字体，确保界面的现代感和清晰度
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <span className="text-primary font-bold">4.</span>
                <div>
                  <h4 className="font-medium mb-1">数字使用等宽字体</h4>
                  <p className="text-sm text-base-content/70">
                    金额、编号等数字内容使用等宽字体，保证对齐和专业性
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}