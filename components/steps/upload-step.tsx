"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAppContext } from '@/lib/store'
import { processReceiptImage, createManualReceipt } from '@/lib/ocr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Upload, Camera, FileText, ArrowLeft, ArrowRight, AlertCircle, FlaskConical } from 'lucide-react'
import { demoBuyers, demoReceipt } from '@/lib/demo-data'
import { useTranslations } from 'next-intl'

export function UploadStep() {
  const t = useTranslations('UploadStep')
  const { setReceipt, setStep, setProcessing, isProcessing, addBuyer, buyers } = useAppContext()

  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // 📸 NUEVO
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // 📂 fallback upload
  const fileInputRef = useRef<HTMLInputElement>(null)

  // =============================
  // 📸 Cámara
  // =============================
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }

      setStream(mediaStream)
    } catch (err) {
      console.error("Camera error:", err)
      setError("No se pudo acceder a la cámara")
    }
  }

  useEffect(() => {
    startCamera()

    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // =============================
  // 📸 Capturar foto
  // =============================
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    ctx?.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
      await handleFile(file)
    }, "image/jpeg")
  }

  // =============================
  // 🧠 Procesar archivo
  // =============================
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('errorImage'))
      return
    }

    setError(null)
    setProcessing(true)

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
  }, [setReceipt, setStep, setProcessing])

  // =============================
  // 📂 Upload fallback
  // =============================
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
      e.target.value = ''
    }
  }

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Spinner className="h-8 w-8" />
              <p>{t('processing')}</p>
              {preview && (
                <img src={preview} className="max-h-40 opacity-50 rounded-lg" />
              )}
            </div>
          ) : (
            <>
              {/* 📸 Cámara en vivo */}
              <video
                ref={videoRef}
                className="w-full rounded-xl bg-black"
              />

              <canvas ref={canvasRef} className="hidden" />

              {/* 📸 Botón captura */}
              <Button
                className="w-full h-14 text-lg"
                onClick={handleCapture}
              >
                <Camera className="mr-2 h-6 w-6" />
                {t('takePhoto')}
              </Button>

              {/* 📂 Upload fallback */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Subir imagen
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />

              {error && (
                <div className="flex gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button variant="outline" onClick={handleManualEntry}>
                <FileText className="mr-2 h-4 w-4" />
                {t('manualEntry')}
              </Button>

              <Button variant="secondary" onClick={handleLoadDemo}>
                <FlaskConical className="mr-2 h-4 w-4" />
                {t('loadDemo')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('buyers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <Button onClick={() => setStep('review')} disabled={isProcessing} variant="ghost">
          {t('skip')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}