"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info, Github, Cpu, FileJson, Globe, Palette, InfoIcon } from "lucide-react"
import { useTranslations } from "next-intl"

export function AboutDialog() {
  const t = useTranslations('About')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <InfoIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{t('version')}</p>
              <p className="text-sm text-muted-foreground mt-1">v0.1.0-alpha</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium border-b pb-1">Features</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                {t('features.i18n')}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileJson className="h-4 w-4" />
                {t('features.ocr')}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="h-4 w-4" />
                {t('features.theme')}
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              {t('builtBy')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => (document.querySelector('[data-state="open"]') as any)?.click()}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
