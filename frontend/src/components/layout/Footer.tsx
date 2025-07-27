import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-100 text-base-content border-t border-base-200">
      <div>
        <p>
          © {currentYear} 薪资管理系统
        </p>
      </div>
    </footer>
  );
}