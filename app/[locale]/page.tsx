"use client"

import { StepIndicator } from '@/components/step-indicator'
import { BuyersStep } from '@/components/steps/buyers-step'
import { UploadStep } from '@/components/steps/upload-step'
import { ReviewStep } from '@/components/steps/review-step'
import { AssignStep } from '@/components/steps/assign-step'
import { SummaryStep } from '@/components/steps/summary-step'
import { useAppContext } from '@/lib/store'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { AboutDialog } from '@/components/about-dialog'
import { CrewHUD } from '@/components/crew-hud'
import { motion } from 'framer-motion'
import { useEffect } from 'react'

function AppContent() {
  const { currentStep } = useAppContext()
  const t = useTranslations('Index');

  // Reset scroll position when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 w-full">
        <div className="container mx-auto px-4 py-2 sm:py-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
            {/* Top Row on Mobile / Left side on Desktop */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="overflow-hidden rounded-sm shrink-0">
                  <Image
                    src="/logo-dark.webp"
                    alt="SplitReceipt Logo"
                    width={48}
                    height={48}
                    priority
                    className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
                  />
                </div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight">{t('header.title')}</h1>
              </div>
              <div className="flex items-center gap-1.5 sm:hidden">
                <AboutDialog />
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
            </div>

            {/* Bottom Row on Mobile / Center on Desktop */}
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 w-full sm:w-auto mb-1 sm:mb-0">
              <StepIndicator />
              {currentStep !== 'buyers' && (
                <div className="h-8 w-[1px] bg-border/40 mx-1 hidden sm:block" />
              )}
              {currentStep !== 'buyers' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <CrewHUD variant="compact" />
                </motion.div>
              )}
            </div>

            {/* Hidden Controls on Mobile (Shown on Desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <AboutDialog />
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4">
        {currentStep === 'buyers' && <BuyersStep />}
        {currentStep === 'upload' && <UploadStep />}
        {currentStep === 'review' && <ReviewStep />}
        {currentStep === 'assign' && <AssignStep />}
        {currentStep === 'summary' && <SummaryStep />}
      </main>
    </div>
  )
}

export default function Home() {
  return <AppContent />
}
