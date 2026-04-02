"use client"

import { useState, useCallback } from 'react'
import { useAppContext } from '@/lib/store'
import { processReceiptImage, createManualReceipt } from '@/lib/ocr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Upload, Camera, FileText, ArrowLeft, ArrowRight, AlertCircle, FlaskConical } from 'lucide-react'
import { demoBuyers, demoReceipt } from '@/lib/demo-data'

export function UploadStep() {
  const { setReceipt, setStep, setProcessing, isProcessing, addBuyer, buyers } = useAppContext()
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setError(null)
    setProcessing(true)
    
    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      const receipt = await processReceiptImage(file)
      setReceipt(receipt)
      setStep('review')
    } catch (err) {
      console.error('OCR Error:', err)
      setError('Failed to process image. You can try again or enter items manually.')
    } finally {
      setProcessing(false)
    }
  }, [setReceipt, setStep, setProcessing])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleManualEntry = () => {
    setReceipt(createManualReceipt())
    setStep('review')
  }

  const handleLoadDemo = () => {
    // Add demo buyers if none exist
    if (buyers.length === 0) {
      demoBuyers.forEach(buyer => addBuyer(buyer))
    }
    
    // Create receipt with unique ID
    const receipt = {
      ...demoReceipt,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
    }
    
    setReceipt(receipt)
    setStep('review')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Receipt
          </CardTitle>
          <CardDescription>
            Take a photo or upload an image of your receipt. We&apos;ll extract the items automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Spinner className="h-8 w-8" />
              <p className="text-muted-foreground">Processing receipt...</p>
              {preview && (
                <img 
                  src={preview} 
                  alt="Receipt preview" 
                  className="max-h-40 rounded-lg opacity-50"
                />
              )}
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Drop an image here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports JPG, PNG, and other image formats
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleManualEntry}
              >
                <FileText className="mr-2 h-4 w-4" />
                Enter items manually
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                onClick={handleLoadDemo}
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                Load demo receipt
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('buyers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={isProcessing}
          variant="ghost"
        >
          Skip OCR
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
