import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer footer-center p-4 bg-base-100 text-base-content border-t border-base-300">
      <div>
        <p>
          {t('app.copyright')} © {currentYear} {t('app.name')}
        </p>
      </div>
    </footer>
  );
}