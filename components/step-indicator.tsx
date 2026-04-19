"use client"

import { useAppContext } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Users, Upload, FileText, Split, Calculator, CheckCircle } from 'lucide-react'
import type { AppStep } from '@/lib/types'
import { useTranslations } from 'next-intl'

const steps: { key: AppStep; label: string; icon: typeof Users }[] = [
  { key: 'buyers', label: 'People', icon: Users },
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'review', label: 'Review', icon: FileText },
  { key: 'assign', label: 'Assign', icon: Split },
  { key: 'summary', label: 'Summary', icon: Calculator },
]

export function StepIndicator() {
  const t = useTranslations('StepIndicator')
  const { currentStep, setStep, buyers, currentReceipt } = useAppContext()

  const currentIndex = steps.findIndex(s => s.key === currentStep)

  const canNavigateTo = (step: AppStep): boolean => {
    const stepIndex = steps.findIndex(s => s.key === step)
    
    // Can always go back
    if (stepIndex < currentIndex) return true
    
    // Check prerequisites for forward navigation
    if (step === 'upload' && buyers.length === 0) return false
    if (step === 'review' && !currentReceipt) return false
    if (step === 'assign' && !currentReceipt) return false
    if (step === 'summary' && !currentReceipt) return false
    
    // Can only go one step forward at a time
    return stepIndex <= currentIndex + 1
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = step.key === currentStep
        const isCompleted = index < currentIndex
        const isClickable = canNavigateTo(step.key)

        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => isClickable && setStep(step.key)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-all",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && !isActive && "bg-primary/10 text-primary",
                !isActive && !isCompleted && "text-muted-foreground",
                isClickable && !isActive && "hover:bg-accent cursor-pointer",
                !isClickable && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="h-4 w-4" />
                {isCompleted && (
                  <CheckCircle className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-green-500 bg-background rounded-full" strokeWidth={3} />
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{t(step.key)}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-4 sm:w-8 h-0.5 mx-1",
                index < currentIndex ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
