'use client';

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type MouseEvent,
  type TouchEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/field';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  Trash2,
  Check,
  X,
  Eraser,
  Undo2,
  ZoomIn,
  ZoomOut,
  PlusCircle,
  Scan,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  price: string;
  confirmed: boolean;
  color: string;
}

interface Props {
  imageUrl: string;
  onAddItems: (
    items: { name: string; price: number; quantity: number }[]
  ) => void;
  onClose: () => void;
}

const BOX_COLORS = [
  'rgba(99,102,241,0.85)',
  'rgba(16,185,129,0.85)',
  'rgba(245,158,11,0.85)',
  'rgba(239,68,68,0.85)',
  'rgba(236,72,153,0.85)',
  'rgba(6,182,212,0.85)',
  'rgba(132,204,22,0.85)',
  'rgba(249,115,22,0.85)',
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function ReceiptAnnotator({ imageUrl, onAddItems, onClose }: Props) {
  const t = useTranslations('Annotator');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', price: '' });
  const [scale, setScale] = useState(1);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 1, h: 1 });
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');
  const colorIndexRef = useRef(0);

  // ─── Load & fit image ───────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setIsImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ─── Resize canvas to container ─────────────────────────────────────────────
  useEffect(() => {
    if (!isImageLoaded || !containerRef.current) return;
    const obs = new ResizeObserver(() => fitCanvas());
    obs.observe(containerRef.current);
    fitCanvas();
    return () => obs.disconnect();
  }, [isImageLoaded]);

  const fitCanvas = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const maxW = containerRef.current.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.65, 700);
    const { naturalWidth: nw, naturalHeight: nh } = imgRef.current;
    const scaleW = maxW / nw;
    const scaleH = maxH / nh;
    const s = Math.min(scaleW, scaleH, 2); // cap at 2×
    setScale(s);
    setCanvasSize({ w: Math.round(nw * s), h: Math.round(nh * s) });
  }, []);

  // ─── Render canvas ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isImageLoaded) return;
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // Draw confirmed boxes
    boxes.forEach((b) => {
      const bx = b.x * scale;
      const by = b.y * scale;
      const bw = b.w * scale;
      const bh = b.h * scale;

      // fill
      ctx.fillStyle = b.color.replace('0.85', '0.18');
      ctx.fillRect(bx, by, bw, bh);

      // border
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.strokeRect(bx, by, bw, bh);

      // label pill
      if (b.label) {
        const text = b.label + (b.price ? ` — ${b.price}` : '');
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(text).width + 14;
        const pillX = bx;
        const pillY = by - 22 < 0 ? by + 4 : by - 24;

        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, tw, 20, 6);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillText(text, pillX + 7, pillY + 14);
      }
    });

    // Draw current (in-progress) box
    if (currentBox) {
      const bx = currentBox.x * scale;
      const by = currentBox.y * scale;
      const bw = currentBox.w * scale;
      const bh = currentBox.h * scale;

      ctx.fillStyle = 'rgba(99,102,241,0.15)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = 'rgba(99,102,241,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
    }
  }, [boxes, currentBox, isImageLoaded, canvasSize, scale]);

  // ─── Pointer helpers ────────────────────────────────────────────────────────
  const getCanvasXY = useCallback(
    (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        clientX = e.touches[0]?.clientX ?? e.changedTouches[0].clientX;
        clientY = e.touches[0]?.clientY ?? e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  const handlePointerDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      if ('touches' in e) e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (mode === 'erase') {
        // erase box at click
        const { x, y } = getCanvasXY(e, canvas);
        setBoxes((prev) =>
          prev.filter(
            (b) => !(x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
          )
        );
        return;
      }

      const { x, y } = getCanvasXY(e, canvas);
      setStartPt({ x, y });
      setCurrentBox({ x, y, w: 0, h: 0 });
      setDrawing(true);
    },
    [mode, getCanvasXY]
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      if ('touches' in e) e.preventDefault();
      if (!drawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasXY(e, canvas);
      setCurrentBox({
        x: Math.min(startPt.x, x),
        y: Math.min(startPt.y, y),
        w: Math.abs(x - startPt.x),
        h: Math.abs(y - startPt.y),
      });
    },
    [drawing, startPt, getCanvasXY]
  );

  const handlePointerUp = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      if ('touches' in e) e.preventDefault();
      if (!drawing) return;
      setDrawing(false);

      if (!currentBox || currentBox.w < 10 || currentBox.h < 10) {
        setCurrentBox(null);
        return;
      }

      const newId = generateId();
      const color = BOX_COLORS[colorIndexRef.current % BOX_COLORS.length];
      colorIndexRef.current++;

      const box: Box = {
        id: newId,
        ...currentBox,
        label: '',
        price: '',
        confirmed: false,
        color,
      };

      setBoxes((prev) => [...prev, box]);
      setCurrentBox(null);
      setEditingId(newId);
      setEditForm({ label: '', price: '' });
    },
    [drawing, currentBox]
  );

  const handleConfirmEdit = useCallback(
    (id: string) => {
      if (!editForm.label.trim()) return;
      setBoxes((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                label: editForm.label.trim(),
                price: editForm.price,
                confirmed: true,
              }
            : b
        )
      );
      setEditingId(null);
    },
    [editForm]
  );

  const handleCancelEdit = useCallback((id: string) => {
    setBoxes((prev) => {
      const box = prev.find((b) => b.id === id);
      if (!box?.confirmed) return prev.filter((b) => b.id !== id);
      return prev;
    });
    setEditingId(null);
  }, []);

  const handleUndo = () => {
    setBoxes((prev) => {
      const next = [...prev];
      next.pop();
      return next;
    });
    setEditingId(null);
  };

  const handleAddAll = () => {
    const confirmed = boxes.filter((b) => b.confirmed && b.label);
    if (confirmed.length === 0) return;

    onAddItems(
      confirmed.map((b) => ({
        name: b.label,
        price: parseFloat(b.price) || 0,
        quantity: 1,
      }))
    );
    onClose();
  };

  const confirmedCount = boxes.filter((b) => b.confirmed).length;

  if (!isImageLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Scan className="w-8 h-8 animate-pulse" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-auto">
          {t('toolbarLabel')}
        </span>

        <Button
          size="sm"
          variant={mode === 'draw' ? 'default' : 'outline'}
          className="h-8 px-3 rounded-xl gap-1.5"
          onClick={() => setMode('draw')}
        >
          <Pencil className="w-3.5 h-3.5" />
          {t('draw')}
        </Button>

        <Button
          size="sm"
          variant={mode === 'erase' ? 'destructive' : 'outline'}
          className="h-8 px-3 rounded-xl gap-1.5"
          onClick={() => setMode('erase')}
        >
          <Eraser className="w-3.5 h-3.5" />
          {t('erase')}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 rounded-xl gap-1.5"
          onClick={handleUndo}
          disabled={boxes.length === 0}
        >
          <Undo2 className="w-3.5 h-3.5" />
          {t('undo')}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 rounded-xl gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => {
            setBoxes([]);
            setEditingId(null);
          }}
          disabled={boxes.length === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('clearAll')}
        </Button>
      </div>

      {/* Instruction */}
      <p className="text-xs text-muted-foreground font-medium bg-muted/40 rounded-xl px-3 py-2 border border-border/50">
        {mode === 'draw' ? t('instructionDraw') : t('instructionErase')}
      </p>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-2xl border-2 border-border/60 shadow-xl"
        style={{ background: '#111' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="block w-full touch-none"
          style={{
            cursor: mode === 'erase' ? 'crosshair' : 'crosshair',
            maxWidth: '100%',
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => {
            if (drawing) {
              setDrawing(false);
              setCurrentBox(null);
            }
          }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Box label editor panel */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            key={editingId}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="bg-card border-2 border-primary/30 rounded-2xl p-4 shadow-xl space-y-3"
          >
            <h4 className="text-sm font-bold flex items-center gap-2 text-primary">
              <PlusCircle className="w-4 h-4" />
              {t('labelItem')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel className="text-xs mb-1">
                  {t('itemName')}
                </FieldLabel>
                <Input
                  autoFocus
                  placeholder={t('itemNamePlaceholder')}
                  value={editForm.label}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, label: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEdit(editingId);
                    if (e.key === 'Escape') handleCancelEdit(editingId);
                  }}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel className="text-xs mb-1">
                  {t('itemPrice')}
                </FieldLabel>
                <Input
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, price: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEdit(editingId);
                    if (e.key === 'Escape') handleCancelEdit(editingId);
                  }}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9"
                onClick={() => handleCancelEdit(editingId)}
              >
                <X className="w-4 h-4 mr-1.5" />
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                className="rounded-xl h-9"
                disabled={!editForm.label.trim()}
                onClick={() => handleConfirmEdit(editingId)}
              >
                <Check className="w-4 h-4 mr-1.5" />
                {t('confirm')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed items summary */}
      {confirmedCount > 0 && !editingId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t('confirmedItems', { count: confirmedCount })}
          </p>
          <div className="flex flex-col gap-1.5">
            {boxes
              .filter((b) => b.confirmed)
              .map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/50 bg-muted/30 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: b.color }}
                    />
                    <span className="font-medium">{b.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {b.price ? `${parseFloat(b.price).toFixed(2)}` : '—'}
                    </span>
                    <button
                      onClick={() => {
                        setEditForm({ label: b.label, price: b.price });
                        setEditingId(b.id);
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setBoxes((prev) => prev.filter((x) => x.id !== b.id))
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2 border-t border-border/40">
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-11"
          onClick={onClose}
        >
          {t('closeAnnotator')}
        </Button>
        <Button
          className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
          disabled={confirmedCount === 0}
          onClick={handleAddAll}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('addItems', { count: confirmedCount })}
        </Button>
      </div>
    </div>
  );
}
