'use client'

import { Github, Linkedin, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('Footer')
  return (
    <footer className="w-full py-4 mt-auto border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">

        {/* Helper Text */}
        <div className="flex items-center gap-1 order-1 md:order-1">
          <span>{t('description', { defaultMessage: 'Split 💲receipts easily with 🤼friends' })}</span>
        </div>

        {/* Attribution & Links */}
        <div className="flex items-center gap-4 order-2 md:order-2">
          <div className="flex items-center gap-1.5">
            <span>{t('builtBy', { defaultMessage: 'Built by' })}</span>
            <a
              href="https://linkedin.com/in/codingfer"
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4"
            >
              codingfer
            </a>
            <Heart className="h-3 w-3 text-destructive fill-destructive/20" />
          </div>

          <div className="hidden sm:block h-3 w-px bg-border/60" />

          <nav className="flex items-center gap-3">
            <a
              href="https://linkedin.com/in/codingfer"
              target="_blank"
              rel="noreferrer"
              title="LinkedIn"
              className="hover:text-primary transition-all hover:scale-110 active:scale-95"
            >
              <Linkedin className="h-4 w-4" />
              <span className="sr-only">LinkedIn</span>
            </a>
            <a
              href="https://github.com/codingFer/split-receipt"
              target="_blank"
              rel="noreferrer"
              title="GitHub"
              className="hover:text-primary transition-all hover:scale-110 active:scale-95"
            >
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
