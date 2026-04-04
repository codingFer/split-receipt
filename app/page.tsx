"use client"

import { AppProvider } from '@/components/app-provider'
import { StepIndicator } from '@/components/step-indicator'
import { BuyersStep } from '@/components/steps/buyers-step'
import { UploadStep } from '@/components/steps/upload-step'
import { ReviewStep } from '@/components/steps/review-step'
import { AssignStep } from '@/components/steps/assign-step'
import { SummaryStep } from '@/components/steps/summary-step'
import { useAppContext } from '@/lib/store'
import { Receipt } from 'lucide-react'

function AppContent() {
  const { currentStep } = useAppContext()

  return (
    <div className="bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <Receipt className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold">SplitReceipt</h1>
            </div>
            <div className="flex-1 flex justify-center">
              <StepIndicator />
            </div>
            <div className="hidden sm:block w-32" />
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
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
