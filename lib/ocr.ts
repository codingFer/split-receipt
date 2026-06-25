import type { Receipt, ReceiptItem, ParsedLine } from './types'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

interface WordData {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
export async function processReceiptImage(imageFile: File): Promise<Receipt> {
  let imageUrl = ''

  if (imageFile.type === 'application/pdf') {
    try {
      imageUrl = await pdfToDataUrl(imageFile)
    } catch (err) {
      console.error('PDF Conversion Error:', err)
      return makeEmptyReceipt(imageFile.name.replace('.pdf', ''))
    }
  } else {
    imageUrl = await fileToDataUrl(imageFile)
  }

  // Use both Spanish and English for better coverage of mixed receipts
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['spa', 'eng'])

  try {
    const { data } = await worker.recognize(imageUrl)

    const words: WordData[] = (data.words || []).map((w: any) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: w.bbox,
    }))

    const lines = reconstructLinesFromWords(words)

    console.log('[OCR] Reconstructed lines:', lines.map(l => l.text))

    const receipt = parseReceiptLines(lines, imageUrl)
    return receipt
  } finally {
    await worker.terminate()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE → DATA URL  (resizes to max 2400px, 90% quality JPEG)
// ─────────────────────────────────────────────────────────────────────────────
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 2400
        let { width, height } = img
        const ratio = Math.min(MAX / width, MAX / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Pre-process: increase contrast slightly for OCR
          ctx.filter = 'contrast(1.15) brightness(1.05)'
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.92))
        } else {
          resolve(reader.result as string)
        }
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function pdfToDataUrl(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2.5 }) // higher scale for PDFs

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create canvas context')

  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.92)
}

// ─────────────────────────────────────────────────────────────────────────────
// RECONSTRUCT LINES FROM WORD BBOXES
// Groups words into horizontal lines using Y-center proximity.
// Stores the minimum Y of each group for deterministic sort.
// ─────────────────────────────────────────────────────────────────────────────
function reconstructLinesFromWords(words: WordData[]): ParsedLine[] {
  if (!words || words.length === 0) return []

  // Filter out very low-confidence junk (< 20%)
  const filtered = words.filter(w => w.confidence > 20 && w.text.trim().length > 0)
  if (filtered.length === 0) return []

  const avgHeight =
    filtered.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / filtered.length
  const yThreshold = avgHeight * 0.55 // words within 55% of avg height → same line

  interface LineGroup {
    words: WordData[]
    centerY: number
    minY: number
  }

  const groups: LineGroup[] = []

  for (const word of filtered) {
    const wCenterY = (word.bbox.y0 + word.bbox.y1) / 2
    let placed = false

    for (const g of groups) {
      if (Math.abs(wCenterY - g.centerY) < yThreshold) {
        g.words.push(word)
        // Update running centerY as average
        g.centerY =
          g.words.reduce((s, w) => s + (w.bbox.y0 + w.bbox.y1) / 2, 0) / g.words.length
        g.minY = Math.min(g.minY, word.bbox.y0)
        placed = true
        break
      }
    }

    if (!placed) {
      groups.push({
        words: [word],
        centerY: wCenterY,
        minY: word.bbox.y0,
      })
    }
  }

  // Sort groups top-to-bottom
  groups.sort((a, b) => a.minY - b.minY)

  return groups.map(g => {
    g.words.sort((a, b) => a.bbox.x0 - b.bbox.x0)
    const text = g.words.map(w => w.text).join(' ').trim()
    const avgConf = g.words.reduce((s, w) => s + w.confidence, 0) / g.words.length
    return { text, confidence: avgConf / 100 }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT CLEANING
// ─────────────────────────────────────────────────────────────────────────────
function cleanItemName(raw: string): string {
  return raw
    .replace(/^\d{3,}-?/, '')       // product codes at start
    .replace(/\b\d+[\.,]?\d*\b/g, '') // stray numbers
    .replace(/\s*[xX]\s*/g, ' ')    // quantity "x"
    .replace(/[|!_]+/g, ' ')        // OCR artifacts
    .replace(/\s+/g, ' ')
    .replace(/^[\s\.,\-:]+|[\s\.,\-:]+$/g, '')
    .trim()
}

function preCleanLine(text: string): string {
  return text
    .trim()
    // Remove trailing currency words/symbols
    .replace(/\s*(?:bs\.?|bob|\$|usd)\s*[-—]?\s*$/i, '')
    // Remove trailing dashes
    .replace(/\s*[-—]\s*$/, '')
    .trim()
}

function isOnlyQuantityLine(text: string): boolean {
  // Strip all digits, spaces, and common quantity/price characters
  const stripped = text.replace(/[\s\d\.,xX%*\-\+\/=@]/g, '')
  // If there are less than 2 alphabetic characters left, it is an only-quantity/numbers line.
  return stripped.length < 2
}

/**
 * Normalise a price string into a float.
 * Handles Bolivian formats like "7 70000", "1.350,00", "13.50", etc.
 */
function normalizePrice(raw: string): number {
  let s = raw.replace(/[^\d\s\.,]/g, '').trim()

  // "7 70000" → "7.70000"  (space between digits)
  s = s.replace(/(\d)\s+(\d)/g, '$1.$2')
  s = s.replace(/\s+/g, '')

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  const lastSeparator = Math.max(lastDot, lastComma)
  
  if (lastSeparator !== -1) {
    const integerPart = s.substring(0, lastSeparator).replace(/[\.,]/g, '')
    const decimalPart = s.substring(lastSeparator + 1)
    s = integerPart + '.' + decimalPart
  }

  const n = parseFloat(s)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

function extractPriceFromEnd(
  text: string
): { price: number; name: string } | null {
  const cleaned = preCleanLine(text)
  let s = cleaned
    .replace(/[—–]+/g, ' ')
    .replace(/[|!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Match a price number at the end of the line (with optional thousands separator and any decimals)
  const priceRegex = /\s+((?:\d{1,3}[\.,\s])*\d+(?:[\.,]\d+)?)\s*$/
  const m = s.match(priceRegex)
  if (m) {
    const priceStr = m[1]
    const nameStr = s.substring(0, s.lastIndexOf(priceStr)).trim()
    const name = cleanItemName(nameStr)
    const price = normalizePrice(priceStr)
    if (name.length > 1 && price > 0 && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(name)) {
      return { price, name }
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PARSER
// Works on two passes:
//   1) Pick store name + date from the first ~15 lines
//   2) Identify items: same-line (name + price) or split (name line → price line)
// ─────────────────────────────────────────────────────────────────────────────
function parseReceiptLines(lines: ParsedLine[], imageUrl: string): Receipt {
  const items: ReceiptItem[] = []
  let storeName = ''
  let date = ''
  let total = 0

  const dateRe = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  const dateReYF = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  const totalRe = /total\s*a?\s*pagar|total\s*bs\.?|monto\s*a\s*pagar/i

  // Lines we always skip
  const SKIP = [
    /^cant\.?\s*p\.?\s*unt/i,
    /detalle/i,
    /subtotal/i,
    /^nit\b/i,
    /^ruc\b/i,
    /^factura\s*n[°o]/i,
    /^sucursal/i,
    /^fecha\s*[:]/i,
    /^fecha\s*de\s*emisi[oó]n/i,
    /cambio\s*bs/i,
    /credito\s*fiscal/i,
    /importe\s*base/i,
    /trx\s*:/i,
    /cj\s*:/i,
    /^\*+/,
    /^[-=]+$/,
    /^\s*$/,
    /unidad\s*de\s*medida/i,
    /descuento\s*bs/i,
    /monto\s*gift/i,
    /son:/i,
    /ley\s*n[°o]/i,
    /representaci[oó]n\s*gr[aá]fica/i,
    /gracias\s*por/i,
    /^tel[eé]fono/i,
    /^direcci[oó]n/i,
    /^email/i,
    /^www\./i,
    /^\d{4}\s*\d{4}\s*\d{4}/, // card numbers
  ]

  // ── Pass 1: store name y fecha ──
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const t = lines[i].text.trim()

    // Date
    const dm = t.match(dateRe) || t.match(dateReYF)
    if (dm && !date) {
      date = dm[1].length === 4
        ? `${dm[3]}/${dm[2]}/${dm[1]}`
        : `${dm[1]}/${dm[2]}/${dm[3]}`
    }

    // Store name
    if (i < 6 && !storeName) {
      const c = t.replace(/\*+/g, '').trim()
      if (
        c.length > 3 &&
        !/factura|cr[ée]dito|sucursal|nit|ruc|derecho|fiscal/i.test(c) &&
        !/^\d/.test(c) &&
        !SKIP.some(p => p.test(c))
      ) {
        storeName = c
      }
    }
  }

  // ── Pass 2: extract items ──
  let lastTextLine = ''
  let lastTextConf = 0

  for (let i = 0; i < lines.length; i++) {
    const { text, confidence } = lines[i]
    const trimmed = text.trim()
    if (!trimmed) continue

    const cleaned = preCleanLine(trimmed)

    // Detect TOTAL line
    if (totalRe.test(cleaned)) {
      const pm = cleaned.match(/(\d+[\.,]\d{2})\s*[-—]?\s*$/)
      if (pm) total = parseFloat(pm[1].replace(',', '.'))
      lastTextLine = ''
      continue
    }

    // Skip noise lines
    if (SKIP.some(p => p.test(cleaned))) {
      if (/^[-=]+$|^\*+$/.test(cleaned)) {
        lastTextLine = ''
      }
      continue
    }

    // If it's a numeric/quantity line with a price at the end:
    if (isOnlyQuantityLine(cleaned)) {
      const priceRegex = /((?:\d{1,3}[\.,\s])*\d+(?:[\.,]\d+)?)\s*$/
      const pm = cleaned.match(priceRegex)
      if (pm) {
        const price = normalizePrice(pm[1])
        if (price > 0 && lastTextLine) {
          const isDuplicate = items.some(
            item => item.name === lastTextLine && Math.abs(item.price - price) < 0.01
          )
          if (!isDuplicate) {
            pushItem(items, lastTextLine, 1, price, lastTextConf)
          }
        }
      }
      continue
    }

    // ── Try same-line extraction (name + price on one line)
    const extracted = extractPriceFromEnd(cleaned)
    if (extracted && extracted.price > 0 && extracted.name.length > 1) {
      if (!/^(NIT|COD|CUF|RAZ[OÓ]N|N[O°]?FACTURA|CLIENTE|CUI|CI\b)/i.test(cleaned)) {
        pushItem(items, extracted.name, 1, extracted.price, confidence)
        // Clear lastTextLine so that following quantity lines don't pair with this same-line item
        lastTextLine = ''
        continue
      }
    }

    // Otherwise, if line has enough letters and is not a header, it is a text line (product name)
    const letterCount = (cleaned.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) || []).length
    if (letterCount > 2) {
      if (!/^(NIT|COD\.?CLIENTE|CUF|NOMBRE|RAZ[OÓ]N|N[O°]?FACTURA|CLIENTE|CUI|CI\b)/i.test(cleaned)) {
        lastTextLine = cleaned.replace(/^\d{3,}-?/, '').trim()
        lastTextConf = confidence
      }
    }
  }

  if (total === 0) {
    total = items.reduce((s, it) => s + it.price, 0)
  }

  return {
    id: generateId(),
    storeName: storeName || 'Recibo',
    date: date || new Date().toLocaleDateString(),
    items,
    subtotal: total,
    tax: 0,
    total,
    imageUrl,
    createdAt: new Date(),
  }
}

function pushItem(
  items: ReceiptItem[],
  name: string,
  quantity: number,
  price: number,
  confidence: number
) {
  const cleanName = cleanItemName(name)
  if (!cleanName || cleanName.length < 2) return
  items.push({
    id: generateId(),
    name: cleanName,
    quantity,
    price,
    confidence,
    assignments: [],
  })
}

function makeEmptyReceipt(name: string): Receipt {
  return {
    id: generateId(),
    storeName: name || 'Recibo',
    date: new Date().toLocaleDateString(),
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: new Date(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL / SIAT
// ─────────────────────────────────────────────────────────────────────────────
export function createManualReceipt(): Receipt {
  return {
    id: generateId(),
    storeName: 'Entrada Manual',
    date: new Date().toLocaleDateString(),
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: new Date(),
  }
}

export function parseSiatReceipt(text: string): Receipt {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let storeName = ''
  let date = ''
  let total = 0
  const items: ReceiptItem[] = []
  let inProductsSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line === 'Razón Social:' && i + 1 < lines.length) {
      storeName = lines[i + 1]
    } else if (line === 'Fecha Emisión:' && i + 1 < lines.length) {
      date = lines[i + 1].split(' ')[0]
    } else if (line === 'Monto Total:' && i + 1 < lines.length) {
      total = parseFloat(lines[i + 1].replace(/[^\d\.]/g, ''))
    } else if (
      line.startsWith('Código\tDescripción') ||
      line.startsWith('Código Descripción')
    ) {
      inProductsSection = true
      continue
    } else if (line === 'Detalle de Productos') {
      // header follows
    } else if (inProductsSection) {
      const parts = line.split('\t')
      if (parts.length >= 5) {
        const name = parts[1].trim()
        const quantity = parseInt(parts[2].replace(/[^\d]/g, ''), 10) || 1
        const price = parseFloat(parts[4].replace(/[^\d\.]/g, '')) || 0
        if (name && price > 0) {
          items.push({ id: generateId(), name, quantity, price, confidence: 1, assignments: [] })
        }
      } else {
        // Fallback: space-separated
        const m = line.match(
          /^(\S+)\s+(.*?)\s+(\d+)\s+([\d\.]+)\s*Bs\.?\s+([\d\.]+)\s*Bs\.?$/i
        )
        if (m) {
          items.push({
            id: generateId(),
            name: m[2].trim(),
            quantity: parseInt(m[3], 10),
            price: parseFloat(m[5]),
            confidence: 1,
            assignments: [],
          })
        }
      }
    }
  }

  return {
    id: generateId(),
    storeName: storeName || 'SIAT Factura',
    date: date || new Date().toLocaleDateString(),
    items,
    subtotal: total,
    tax: 0,
    total,
    createdAt: new Date(),
  }
}
