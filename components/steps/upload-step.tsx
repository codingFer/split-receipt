"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAppContext } from '@/lib/store'
import { processReceiptImage, createManualReceipt } from '@/lib/ocr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Upload, Camera, FileText, ArrowLeft, ArrowRight, AlertCircle, FlaskConical, X, ChevronRight, Smartphone } from 'lucide-react'
import { demoBuyers, demoReceipt } from '@/lib/demo-data'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function UploadStep() {
  const t = useTranslations('UploadStep')
  const { setReceipt, setStep, setProcessing, isProcessing, addBuyer, buyers } = useAppContext()
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isOperaMini, setIsOperaMini] = useState(false)
  const [hasCameraSupport, setHasCameraSupport] = useState(true)
  
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('errorImage'))
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
      setError(t('errorProcess'))
    } finally {
      setProcessing(false)
    }
  }, [setReceipt, setStep, setProcessing, t])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  const startCamera = async () => {
    setError(null)
    try {
      // Trying different constraints if environment fails
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Force play for mobile browsers
        try {
          await videoRef.current.play()
        } catch (e) {
          console.error("Video play failed:", e)
        }
      }
      setIsCameraActive(true)
    } catch (err) {
      console.error('Camera Access Error:', err)
      setError(t('cameraError'))
      // If direct camera fails, try the fallback system camera
      setTimeout(() => {
        cameraInputRef.current?.click()
      }, 500)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        // High resolution capture
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-receipt.jpg', { type: 'image/jpeg' })
            stopCamera()
            handleFile(file)
          }
        }, 'image/jpeg', 0.95)
      }
    }
  }

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const isOM = ua.indexOf('opera mini') > -1 || ua.indexOf('opios') > -1
    setIsOperaMini(isOM)
    
    // Check for getUserMedia support
    const support = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    setHasCameraSupport(support)

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

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
    if (buyers.length === 0) {
      demoBuyers.forEach(buyer => addBuyer(buyer))
    }
    
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
      {isCameraActive ? (
        <Card className="overflow-hidden border-2 border-primary shadow-2xl animate-in fade-in zoom-in duration-500 rounded-2xl">
          <CardHeader className="bg-primary text-primary-foreground py-4 px-6 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t('takePhoto')}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-white/20 h-8 w-8 rounded-full"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 relative bg-black aspect-[3/4] flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              <div className="w-full h-full border-2 border-primary/50 rounded-2xl border-dashed relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-primary/20" />
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-primary/20" />
              </div>
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10 font-bold"
                onClick={stopCamera}
              >
                {t('cancel')}
              </Button>
              
              <Button 
                size="icon"
                className="h-20 w-20 rounded-full bg-white hover:bg-white/90 p-0 shadow-2xl ring-8 ring-white/20 border-6 border-black/20 group"
                onClick={capturePhoto}
              >
                <div className="h-14 w-14 rounded-full bg-primary group-hover:scale-105 transition-transform" />
              </Button>
              
              <div className="w-[70px]" /> {/* Spacer for symmetry */}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="transition-all duration-500 shadow-xl border-primary/10 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl font-black italic text-primary">
                <Upload className="h-6 w-6" />
                {t('title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground font-medium">
                {t('description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-8">
                  <div className="relative">
                    <Spinner className="h-20 w-20 text-primary" />
                    <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-black text-xl tracking-tight animate-pulse">{t('processing')}</p>
                    <p className="text-xs text-muted-foreground font-medium">Estamos procesando tu ticket, espera un momento...</p>
                  </div>
                  {preview && (
                    <div className="relative group max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <img 
                        src={preview} 
                        alt="Receipt preview" 
                        className="rounded-2xl shadow-2xl ring-1 ring-white/10 opacity-60 filter grayscale-[20%]"
                      />
                      <div className="absolute inset-0 bg-primary/5 rounded-2xl animate-pulse" />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-5">
                    {/* Primary Photo Button */}
                    <div className="grid grid-cols-1 gap-4">
                      {hasCameraSupport && !isOperaMini ? (
                        <Button
                          size="lg"
                          className="h-24 text-xl font-black shadow-2xl bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 group rounded-2xl"
                          onClick={startCamera}
                        >
                          <Camera className="mr-3 h-8 w-8 group-hover:rotate-6 transition-transform" />
                          {t('takePhoto')}
                          <ChevronRight className="ml-auto h-6 w-6 opacity-30" />
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className="h-28 flex-col gap-2 text-xl font-black shadow-2xl bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 group rounded-2xl"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <div className="flex items-center">
                            <Camera className="mr-3 h-8 w-8 group-hover:rotate-6 transition-transform" />
                            {t('takePhoto')}
                          </div>
                          <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Usar aplicación nativa</span>
                        </Button>
                      )}

                      {/* Improved Drop Zone */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        className={cn(
                          "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-500 flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden",
                          dragActive ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFile(e.target.files[0])
                            }
                          }}
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = ''
                          } }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all group-hover:scale-110 shadow-inner">
                          <Upload className="h-7 w-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-sm uppercase tracking-wide group-hover:text-primary transition-colors">{t('dropText')}</p>
                          <p className="text-[10px] text-muted-foreground mt-2 font-bold opacity-60">PNG, JPEG, WEBP HASTA 20MB</p>
                        </div>
                        
                        {/* Decorative background for drop zone */}
                        <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
                      </div>
                    </div>

                    {isOperaMini && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200/50 dark:border-amber-800/20 p-5 rounded-2xl text-amber-800 dark:text-amber-200 text-xs leading-relaxed flex gap-4 shadow-sm items-center">
                        <Smartphone className="h-8 w-8 shrink-0 text-amber-500 animate-bounce" />
                        <div className="space-y-1">
                          <p className="font-black text-sm uppercase tracking-tight">Atención: Modo Opera Mini</p>
                          <p className="opacity-80 font-medium">Este navegador autocomprime la página. Si la cámara lenta, te recomendamos usar el botón de arriba para abrir tu cámara normal o subir desde galería.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-destructive/10 text-destructive border-2 border-destructive/20 animate-in slide-in-from-top-4 duration-500 shadow-lg">
                      <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                      <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
                    </div>
                  )}

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-primary/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em] text-muted-foreground">
                      <span className="bg-card px-4">{t('or')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-14 font-black border-primary/20 shadow-md hover:bg-primary/5 hover:border-primary/50 transition-all rounded-xl"
                      onClick={handleManualEntry}
                    >
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      {t('manualEntry')}
                    </Button>

                    <Button
                      variant="secondary"
                      className="h-14 font-black shadow-md border-2 border-transparent hover:border-primary/20 transition-all rounded-xl"
                      onClick={handleLoadDemo}
                    >
                      <FlaskConical className="mr-2 h-5 w-5 text-primary" />
                      {t('loadDemo')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center px-4 pt-2">
            <Button variant="ghost" onClick={() => setStep('buyers')} className="text-sm font-black hover:bg-primary/10 rounded-full px-6 text-muted-foreground hover:text-primary transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
            <Button
              onClick={() => setStep('review')}
              disabled={isProcessing}
              variant="ghost"
              className="text-xs font-black text-muted-foreground/50 hover:text-primary transition-all uppercase tracking-widest"
            >
              {t('skip')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Modern system camera input fallback */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0])
          }
        }}
      />
    </div>
  )
}
