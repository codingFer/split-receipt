'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '@/lib/store';
import { processReceiptImage, createManualReceipt, parseSiatReceipt } from '@/lib/ocr';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  ImagePlus,
  Camera,
  FileUp,
  FileText,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { demoBuyers, demoReceipt } from '@/lib/demo-data';
import { useTranslations } from 'next-intl';

export function UploadStep() {
  const t = useTranslations('UploadStep');
  const { setReceipt, setStep, setProcessing, isProcessing, addBuyer, buyers } =
    useAppContext();

  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 📸 NUEVO
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // 📂 fallback upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [showSiatMode, setShowSiatMode] = useState(false);
  const [siatText, setSiatText] = useState('');

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          // Added catch to prevent unmounted play() promise rejections
          await videoRef.current
            .play()
            .catch((e) => console.warn('Play interrupted:', e));
        }

        setStream(activeStream);
      } catch (err) {
        console.error('Camera error:', err);
        setError(t('errorProcess') || 'No se pudo acceder a la cámara');
      }
    };

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // =============================
  // 📸 Capturar foto
  // =============================
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      await handleFile(file);
    }, 'image/jpeg');
  };

  // =============================
  // 🧠 Procesar archivo
  // =============================
  const handleFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        setError(t('errorImage'));
        return;
      }

      setError(null);
      setProcessing(true);

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null); // PDFs don't have a simple preview without a library
      }

      try {
        const receipt = await processReceiptImage(file);
        console.log('test1');
        console.log(receipt);
        console.log('test1');
        setReceipt(receipt);
        setStep('review');
      } catch (err) {
        console.error('OCR Error:', err);
        setError(t('errorProcess'));
      } finally {
        setProcessing(false);
      }
    },
    [setReceipt, setStep, setProcessing]
  );

  // =============================
  // 📂 Upload fallback
  // =============================
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleManualEntry = () => {
    setReceipt(createManualReceipt());
    setStep('review');
  };

  const handleSiatProcess = () => {
    if (!siatText.trim()) return;
    try {
      setProcessing(true);
      setError(null);
      const receipt = parseSiatReceipt(siatText);
      setReceipt(receipt);
      setStep('review');
    } catch (err) {
      console.error('SIAT Parse Error:', err);
      setError(t('errorProcess'));
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadDemo = () => {
    if (buyers.length === 0) {
      demoBuyers.forEach((buyer) => addBuyer(buyer));
    }

    const receipt = {
      ...demoReceipt,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date(),
    };

    setReceipt(receipt);
    setStep('review');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {showSiatMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 bg-primary/5 rounded-xl space-y-2 text-sm border border-primary/20">
                <p className="font-bold flex items-center gap-2">
                  <span className="text-base">🇧🇴</span>
                  <span className="bg-gradient-to-r from-red-600 from-[33.3%] via-yellow-500 via-[33.3%] via-[66.6%] to-green-600 to-[66.6%] bg-clip-text text-transparent">
                    {t('siatTitle')}
                  </span>
                </p>
                <ol className="list-none space-y-1 text-muted-foreground font-medium">
                  <li>{t('siatStep1')}</li>
                  <li>{t('siatStep2')}</li>
                  <li>{t('siatStep3')}</li>
                </ol>
              </div>
              <Textarea
                placeholder={t('siatPastePlaceholder')}
                className="min-h-[160px] font-mono text-xs custom-scrollbar resize-none border-primary/20 focus-visible:ring-primary/30"
                value={siatText}
                onChange={(e) => setSiatText(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowSiatMode(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('back')}
                </Button>
                <Button className="flex-1 shadow-lg shadow-primary/20" onClick={handleSiatProcess} disabled={!siatText.trim() || isProcessing}>
                  {t('siatProcess')}
                </Button>
              </div>
              {error && (
                <div className="flex gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mt-4 animate-in fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>
          ) : isProcessing ? (
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
              <video ref={videoRef} className="w-full rounded-xl bg-black" />

              <canvas ref={canvasRef} className="hidden" />

              {/* 📸 Botón captura */}
              <Button className="w-full h-14 text-lg" onClick={handleCapture}>
                <Camera className="mr-2 h-6 w-6" />
                {t('takePhoto')}
              </Button>

              {/* 📂 Upload buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {t('uploadImage')}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {t('uploadPdf')}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />

              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUpload}
              />

              {error && (
                <div className="flex gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full h-12 justify-center hover:bg-red-50/30 border-red-100 dark:border-red-900/20" onClick={() => setShowSiatMode(true)}>
                  <span className="mr-3 text-xl">🇧🇴</span>
                  <span className="bg-gradient-to-r from-red-600 from-[33.3%] via-yellow-500 via-[33.3%] via-[66.6%] to-green-600 to-[66.6%] bg-clip-text text-transparent font-bold uppercase tracking-tight">
                    {t('siatButton')}
                  </span>
                </Button>

                <Button variant="outline" className="w-full h-12 justify-center" onClick={handleManualEntry}>
                  <FileText className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span className="font-bold uppercase tracking-tight text-muted-foreground">{t('manualEntry')}</span>
                </Button>
                
                <Button variant="secondary" className="w-full h-12 justify-center" onClick={handleLoadDemo}>
                  <FlaskConical className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span className="font-bold uppercase tracking-tight text-muted-foreground">{t('loadDemo')}</span>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('buyers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>

        <Button
          onClick={() => setStep('review')}
          disabled={isProcessing}
          variant="ghost"
        >
          {t('skip')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
