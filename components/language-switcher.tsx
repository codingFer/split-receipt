'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/routing';
import {useTransition} from 'react';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, {locale: nextLocale});
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelectChange('en')} className={locale === 'en' ? 'bg-accent' : ''}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('es')} className={locale === 'es' ? 'bg-accent' : ''}>
          Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
