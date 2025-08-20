import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'dropdown' | 'buttons' | 'select';
}

export function LanguageSwitcher({
  className,
  size = 'sm',
  variant = 'dropdown'
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' }
  ];

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  if (variant === 'dropdown') {
    return (
      <div className={cn('dropdown dropdown-end', className)}>
        <div 
          tabIndex={0} 
          role="button" 
          className={cn(
            'btn btn-ghost gap-2',
            {
              'btn-xs': size === 'xs',
              'btn-sm': size === 'sm',
              'btn-md': size === 'md',
              'btn-lg': size === 'lg'
            }
          )}
        >
          <span className="text-base">{currentLang.flag}</span>
          <span className="hidden sm:inline">{currentLang.name}</span>
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
        <ul 
          tabIndex={0} 
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow-lg border border-base-200"
        >
          {languages.map((lang) => (
            <li key={lang.code}>
              <button
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                  {
                    'bg-primary/10 text-primary': i18n.language === lang.code,
                    'hover:bg-base-200': i18n.language !== lang.code
                  }
                )}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <select
        className={cn(
          'select select-bordered',
          {
            'select-xs': size === 'xs',
            'select-sm': size === 'sm',
            'select-md': size === 'md',
            'select-lg': size === 'lg'
          },
          className
        )}
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    );
  }

  // Buttons variant
  return (
    <div className={cn('btn-group', className)}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={cn(
            'btn gap-2',
            {
              'btn-xs': size === 'xs',
              'btn-sm': size === 'sm',
              'btn-md': size === 'md',
              'btn-lg': size === 'lg',
              'btn-primary': i18n.language === lang.code,
              'btn-outline': i18n.language !== lang.code
            }
          )}
        >
          <span className="text-base">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}