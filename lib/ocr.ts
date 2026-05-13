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

export async function processReceiptImage(imageFile: File): Promise<Receipt> {
  let imageUrl = ''

  if (imageFile.type === 'application/pdf') {
    try {
      imageUrl = await pdfToDataUrl(imageFile)
    } catch (err) {
      console.error('PDF Conversion Error:', err)
      return {
        id: generateId(),
        storeName: imageFile.name.replace('.pdf', ''),
        date: new Date().toLocaleDateString(),
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        createdAt: new Date()
      }
    }
  } else {
    imageUrl = await fileToDataUrl(imageFile)
  }

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa')

  try {
    const { data } = await worker.recognize(imageUrl)

    // ────────────────────────────────────────────────
    // NUEVO: Usar data.words con coordenadas para reconstruir líneas
    // ────────────────────────────────────────────────
    const lines = reconstructLinesFromWords(data.words || [])

    console.log('ocr reconstructed lines')
    console.log(lines.map(line => line.text))
    console.log('ocr reconstructed lines')

    const receipt = parseBolivianReceipt(lines, imageUrl)
    return receipt
  } finally {
    await worker.terminate()
  }
}

// ────────────────────────────────────────────────
// RECONSTRUIR LÍNEAS DESDE WORDS CON COORDENADAS
// ────────────────────────────────────────────────
function reconstructLinesFromWords(words: WordData[]): ParsedLine[] {
  if (!words || words.length === 0) return []

  // 1. Calcular altura promedio de palabras para determinar umbral de agrupación
  const avgHeight = words.reduce((sum, w) => sum + (w.bbox.y1 - w.bbox.y0), 0) / words.length
  const yThreshold = avgHeight * 0.6  // 60% de altura promedio

  // 2. Agrupar words por líneas horizontales (misma Y)
  const lineGroups: WordData[][] = []

  for (const word of words) {
    const wordCenterY = (word.bbox.y0 + word.bbox.y1) / 2

    // Buscar un grupo existente con Y similar
    let found = false
    for (const group of lineGroups) {
      const groupCenterY = (group[0].bbox.y0 + group[0].bbox.y1) / 2
      if (Math.abs(wordCenterY - groupCenterY) < yThreshold) {
        group.push(word)
        found = true
        break
      }
    }

    if (!found) {
      lineGroups.push([word])
    }
  }

  // 3. Ordenar palabras dentro de cada línea por X (izquierda a derecha)
  //    y construir el texto de la línea
  const lines: ParsedLine[] = lineGroups.map(group => {
    // Ordenar por x0
    group.sort((a, b) => a.bbox.x0 - b.bbox.x0)

    // Calcular confidence promedio
    const avgConfidence = group.reduce((sum, w) => sum + w.confidence, 0) / group.length

    // Unir palabras con espacios
    const text = group.map(w => w.text).join(' ')

    return {
      text: text.trim(),
      confidence: avgConfidence / 100
    }
  })

  // 4. Ordenar líneas por Y (arriba a abajo)
  lines.sort((a, b) => {
    const aY = lineGroups.find(g => g.map(w => w.text).join(' ') === a.text)?.[0]?.bbox.y0 || 0
    const bY = lineGroups.find(g => g.map(w => w.text).join(' ') === b.text)?.[0]?.bbox.y0 || 0
    return aY - bY
  })

  return lines
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 2400
        const MAX_HEIGHT = 2400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.90))
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
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)

  const viewport = page.getViewport({ scale: 2.0 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.height = viewport.height
  canvas.width = viewport.width

  if (!context) throw new Error('Could not create canvas context')

  await page.render({ canvasContext: context, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.90)
}

// ────────────────────────────────────────────────
// CLEANING FUNCTIONS (usando regex correctamente con .replace())
// ────────────────────────────────────────────────
function cleanItemName(name: string): string {
  return name
    // Quitar código de producto al inicio (ej: "23153-")
    .replace(/^\d{5,}-/, '')
    // Quitar números sueltos
    .replace(/\b\d+[\.,]?\d*\b/g, '')
    // Quitar X de cantidad
    .replace(/\s*[xX]\s*/g, ' ')
    // Quitar múltiples espacios
    .replace(/\s+/g, ' ')
    // Quitar basura al inicio/final
    .replace(/^[\s\.,\-:]+|[\s\.,\-:]+$/g, '')
    .trim()
}

function isQuantityLine(text: string): boolean {
  const cleaned = text.replace(/[\s\.,]/g, '')
  const digitCount = (cleaned.match(/[\dxX]/g) || []).length
  return cleaned.length > 0 && digitCount / cleaned.length > 0.7
}

function normalizePrice(priceStr: string): number {
  let cleaned = priceStr.replace(/[^\d\s\.,]/g, '').trim()

  // "7 70000" -> "7.70000"
  cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1.$2')
  cleaned = cleaned.replace(/\s+/g, '')
  cleaned = cleaned.replace(',', '.')

  // Sin punto decimal y long > 4: últimos 5 dígitos son decimales
  if (!cleaned.includes('.') && cleaned.length > 4) {
    const intPart = cleaned.slice(0, -5)
    const decPart = cleaned.slice(-5)
    cleaned = `${intPart || '0'}.${decPart}`
  }

  const price = parseFloat(cleaned)
  return Math.round(price * 100) / 100
}

function extractPriceFromEnd(text: string): { price: number; name: string } | null {
  let cleaned = text
    .replace(/[—–-]+/g, ' ')
    .replace(/[|!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Quitar guión al final de precio: "8.90-" -> "8.90"
  cleaned = cleaned.replace(/(\d[\d\.,]+)\s*[-—]\s*$/, '$1')

  // Patrón principal: nombre + precio al final
  const priceMatch = cleaned.match(/^(.*?)\s+(\d[\d\s\.,]*\d)\s*$/)
  if (priceMatch) {
    const name = cleanItemName(priceMatch[1])
    const price = normalizePrice(priceMatch[2])
    if (name.length > 1 && price > 0 && price < 5000 && /[a-zA-Z]/.test(name)) {
      return { price, name }
    }
  }

  // Fallback: cualquier número al final
  const fallbackMatch = cleaned.match(/^(.*?)\s+(\d+)\s*$/)
  if (fallbackMatch) {
    const name = cleanItemName(fallbackMatch[1])
    const price = normalizePrice(fallbackMatch[2])
    if (name.length > 1 && price > 0 && price < 5000 && /[a-zA-Z]/.test(name)) {
      return { price, name }
    }
  }

  return null
}

// ────────────────────────────────────────────────
// MAIN PARSER
// ────────────────────────────────────────────────
function parseBolivianReceipt(lines: ParsedLine[], imageUrl: string): Receipt {
  const items: ReceiptItem[] = []
  let storeName = ''
  let date = ''
  let total = 0

  const datePattern = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/
  const datePatternYearFirst = /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/
  const totalPattern = /total\s*a?\s*pagar|total\s*bs\.?|monto\s*a\s*pagar/i

  // Líneas a saltar (expandido)
  const skipPatterns = [
    /^cant\.?\s*p\.?\s*unt/i,
    /detalle/i,
    /subtotal/i,
    /^nit/i,
    /^factura/i,
    /^sucursal/i,
    /^fecha\s*:/i,
    /^fecha\s*de\s*emisi[oó]n/i,
    /cambio/i,
    /credito\s*fiscal/i,
    /importe\s*base/i,
    /trx:/i,
    /cj:/i,
    /^\*+/,
    /^-+$/,
    /^\s*$/,
    /unidad de medida/i,
    /descuento\s*bs/i,
    /monto\s*gift\s*card/i,
    /importe\s*base\s*crédito/i,
    /son:/i,
    /ley\s*n°453/i,
    /este documento es la representación/i,
  ]

  // ── First pass: store name y fecha ──
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const text = lines[i].text.trim()

    if (i < 5 && !storeName && text.length > 3) {
      const cleaned = text.replace(/\*+/g, '').trim()
      if (cleaned.length > 2 &&
          !/factura|cr[ée]dito|sucursal|nit|derecho/i.test(cleaned) &&
          !/^\d/.test(cleaned) &&
          !skipPatterns.some(p => p.test(cleaned))) {
        storeName = cleaned
      }
    }

    const dateMatch = text.match(datePattern) || text.match(datePatternYearFirst)
    if (dateMatch && !date) {
      if (dateMatch[1].length === 4) {
        date = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`
      } else {
        date = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`
      }
    }
  }

  let pendingItemName = ''

  // ── Second pass: extract items ──
  for (let i = 0; i < lines.length; i++) {
    const { text, confidence } = lines[i]

    if (!text) continue

    const trimmed = text.trim()

    // Detectar TOTAL primero
    if (totalPattern.test(trimmed)) {
      const priceMatch = trimmed.match(/(\d+[\.,]\d{2})\s*[-—]?\s*$/)
      if (priceMatch) {
        total = parseFloat(priceMatch[1].replace(',', '.'))
      }
      continue
    }

    // Saltar líneas no deseadas
    if (skipPatterns.some(p => p.test(trimmed))) {
      continue
    }

    // ── Líneas de cantidad (con o sin precio integrado)
    if (isQuantityLine(trimmed) || /\b\d+[\.,]\d{2}\s*[xX]\s*\d+[\.,]\d{2}/i.test(trimmed)) {
      // Si hay pendingItemName, intentar extraer precio de esta línea
      if (pendingItemName) {
        const priceMatch = trimmed.match(/(\d+[\.,]\d{2})\s*[-—]?\s*$/)
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'))
          if (price > 0 && price < 5000) {
            items.push({
              id: generateId(),
              name: cleanItemName(pendingItemName),
              quantity: 1,
              price,
              confidence,
              assignments: []
            })
            pendingItemName = ''
            continue
          }
        }
      }
      continue
    }

    // ── Intentar extraer item completo (nombre + precio en misma línea)
    const extracted = extractPriceFromEnd(trimmed)
    if (extracted && extracted.name.length > 1 && extracted.price > 0 && extracted.price < 5000) {
      if (/[a-zA-Z]/.test(extracted.name)) {
        items.push({
          id: generateId(),
          name: extracted.name,
          quantity: 1,
          price: extracted.price,
          confidence,
          assignments: []
        })
        pendingItemName = ''
      }
      continue
    }

    // ── Podría ser nombre de producto esperando precio en siguiente línea
    const lettersMatch = trimmed.match(/[a-zA-Z]/g)
    if (lettersMatch && lettersMatch.length > 3) {
      if (!/^(NIT|COD\.?CLIENTE|CUF|NOMBRE|RAZ[OÓ]N|N[O°]?FACTURA|CLIENTE)/i.test(trimmed)) {
        // Limpiar código de producto si existe
        pendingItemName = trimmed.replace(/^\d{5,}-/, '').trim()
      }
    }
  }

  // ── Calcular total si no se encontró ──
  if (total === 0) {
    total = items.reduce((sum, item) => sum + item.price, 0)
  }

  return {
    id: generateId(),
    storeName: storeName || 'Tienda',
    date: date || new Date().toLocaleDateString(),
    items,
    subtotal: total,
    tax: 0,
    total,
    imageUrl,
    createdAt: new Date()
  }
}

export function createManualReceipt(): Receipt {
  return {
    id: generateId(),
    storeName: 'Entrada Manual',
    date: new Date().toLocaleDateString(),
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: new Date()
  }
}

export function parseSiatReceipt(text: string): Receipt {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let storeName = '';
  let date = '';
  let total = 0;
  const items: ReceiptItem[] = [];

  let inProductsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === 'Razón Social:' && i + 1 < lines.length) {
      storeName = lines[i + 1];
    } else if (line === 'Fecha Emisión:' && i + 1 < lines.length) {
      date = lines[i + 1].split(' ')[0];
    } else if (line === 'Monto Total:' && i + 1 < lines.length) {
      total = parseFloat(lines[i + 1].replace(/[^\d\.]/g, ''));
    } else if (line.startsWith('Código\tDescripción') || line.startsWith('Código Descripción')) {
      inProductsSection = true;
      continue;
    } else if (line === 'Detalle de Productos') {
      // next line might be the header
    } else if (inProductsSection) {
      // Try tab separation first
      const parts = line.split('\t');
      if (parts.length >= 5) {
        const name = parts[1].trim();
        const quantity = parseInt(parts[2].replace(/[^\d]/g, ''), 10) || 1;
        const price = parseFloat(parts[4].replace(/[^\d\.]/g, '')) || 0;
        
        if (name && price > 0) {
          items.push({
            id: generateId(),
            name,
            quantity,
            price,
            confidence: 1,
            assignments: []
          });
        }
      } else {
        // Space separated fallback if copy-paste lost tabs
        const match = line.match(/^(\S+)\s+(.*?)\s+(\d+)\s+([\d\.]+)\s*Bs\.?\s+([\d\.]+)\s*Bs\.?$/i);
        if (match) {
          const name = match[2].trim();
          const quantity = parseInt(match[3], 10);
          const price = parseFloat(match[5]);
          items.push({
            id: generateId(),
            name,
            quantity,
            price,
            confidence: 1,
            assignments: []
          });
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
    createdAt: new Date()
  };
}

