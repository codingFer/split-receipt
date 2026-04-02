"use client"

import { useAppContext } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Calculator,
  RotateCcw,
  Share2,
  Download,
  MessageCircle,
  Copy
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { getProductEmoji } from '@/lib/product-emoji'

export function SummaryStep() {
  const { currentReceipt, calculateSummaries, setStep, reset } = useAppContext()
  
  if (!currentReceipt) return null

  const summaries = calculateSummaries()
  const grandTotal = summaries.reduce((sum, s) => sum + s.total, 0)

  const generateShareText = () => {
    const text = summaries.map(s => 
      `${s.buyer.name}: ${formatCurrency(s.total)}`
    ).join('\n')
    
    return `${currentReceipt.storeName} - ${currentReceipt.date}\n\n${text}\n\nTotal: ${formatCurrency(grandTotal)}`
  }

  const handleShareYoodle = () => {
    const fullText = generateShareText()
    // Open Yoodle PWA with the share text
    const yoodleUrl = `https://yoodle.app/share?text=${encodeURIComponent(fullText)}`
    window.open(yoodleUrl, '_blank')
  }

  const handleCopyToClipboard = async () => {
    const fullText = generateShareText()
    await navigator.clipboard.writeText(fullText)
    alert('Resumen copiado al portapapeles!')
  }

  const handleNativeShare = async () => {
    const fullText = generateShareText()
    if (navigator.share) {
      try {
        await navigator.share({ text: fullText })
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyToClipboard()
    }
  }

  const handleExport = () => {
    const lines = [
      `Receipt Split Summary`,
      `${currentReceipt.storeName} - ${currentReceipt.date}`,
      ``,
      `---`,
      ``
    ]

    summaries.forEach(summary => {
      lines.push(`${summary.buyer.name}: ${formatCurrency(summary.total)}`)
      summary.items.forEach(({ item, amount }) => {
        lines.push(`  - ${item.name}: ${formatCurrency(amount)}`)
      })
      lines.push(``)
    })

    lines.push(`---`)
    lines.push(`Grand Total: ${formatCurrency(grandTotal)}`)

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-split-${currentReceipt.date.replace(/\//g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Summary
          </CardTitle>
          <CardDescription>
            {currentReceipt.storeName} - {currentReceipt.date}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {summaries.map((summary) => (
            <div key={summary.buyer.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: summary.buyer.color }}
                />
                <span className="font-semibold text-lg">{summary.buyer.name}</span>
                <span className="ml-auto text-xl font-bold font-mono">
                  {formatCurrency(summary.total)}
                </span>
              </div>
              
              <div className="pl-7 space-y-1">
                {summary.items.map(({ item, amount }) => (
                  <div 
                    key={item.id}
                    className="flex justify-between text-sm text-muted-foreground"
                  >
                    <span className="flex items-center gap-1">
                      <span>{getProductEmoji(item.name)}</span>
                      {item.name}
                    </span>
                    <span className="font-mono">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-semibold">Grand Total</span>
            <span className="text-2xl font-bold font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button 
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          onClick={handleShareYoodle}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Compartir en Yoodle
        </Button>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={handleNativeShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Compartir
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('assign')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={reset} variant="secondary">
          <RotateCcw className="mr-2 h-4 w-4" />
          Start New
        </Button>
      </div>
    </div>
  )
}
