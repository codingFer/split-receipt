import type { Receipt, ReceiptItem } from './types'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

interface ParsedLine {
  text: string
  confidence: number
}

export async function processReceiptImage(imageFile: File): Promise<Receipt> {
  let imageUrl = ''
  
  if (imageFile.type === 'application/pdf') {
    try {
      imageUrl = await pdfToDataUrl(imageFile)
    } catch (err) {
      console.error('PDF Conversion Error:', err)
      // Fallback a recibo manual si falla la conversión
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
    
    const lines: ParsedLine[] = data.lines.map(line => ({
      text: line.text.trim(),
      confidence: line.confidence / 100
    }))
    
    const receipt = parseBolivianReceipt(lines, imageUrl)
    
    return receipt
  } finally {
    await worker.terminate()
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 2400 // Aumentado para mejor OCR
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
  const page = await pdf.getPage(1) // Solo procesamos la primera página

  const viewport = page.getViewport({ scale: 2.0 }) // Mayor escala para mejor OCR
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.height = viewport.height
  canvas.width = viewport.width

  if (!context) throw new Error('Could not create canvas context')

  await page.render({ canvasContext: context, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.90)
}

// Clean item name - remove numeric garbage and extra spaces
function cleanItemName(name: string): string {
  return name
    // Remove standalone numbers/decimals (like "00000", "7.70000", etc.)
    .replace(/\b\d+[\.,]?\d*\b/g, '')
    // Remove X that was part of quantity expression
    .replace(/\s*[xX]\s*/g, ' ')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove leading/trailing garbage
    .replace(/^[\s\.,\-:]+|[\s\.,\-:]+$/g, '')
    .trim()
}

// Check if a line is just numbers (quantity line)
function isQuantityLine(text: string): boolean {
  // Lines like "1.00000 X 7.70000" or "00000 X 28.50000"
  const cleaned = text.replace(/[\s\.,]/g, '')
  // If more than 70% of characters are digits or X, it's a quantity line
  const digitCount = (cleaned.match(/[\dxX]/g) || []).length
  return digitCount / cleaned.length > 0.7
}

// Normalize a price string that may have OCR errors
function normalizePrice(priceStr: string): number {
  // Remove any non-digit and non-decimal characters except spaces
  let cleaned = priceStr.replace(/[^\d\s\.,]/g, '').trim()
  
  // Handle space in middle of price like "7 70000" -> "7.70000"
  // or "12 90000" -> "12.90000"
  cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1.$2')
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, '')
  
  // Replace comma with dot
  cleaned = cleaned.replace(',', '.')
  
  // If no decimal point, assume last 5 digits are decimals (bolivian receipt format)
  // e.g., "1290000" -> "12.90000" -> 12.90
  if (!cleaned.includes('.') && cleaned.length > 4) {
    const intPart = cleaned.slice(0, -5)
    const decPart = cleaned.slice(-5)
    cleaned = `${intPart || '0'}.${decPart}`
  }
  
  const price = parseFloat(cleaned)
  // Normalize to 2 decimals
  return Math.round(price * 100) / 100
}

// Extract price from end of line
function extractPriceFromEnd(text: string): { price: number; name: string } | null {
  // Clean the text first - remove common OCR artifacts
  let cleaned = text
    .replace(/[—–-]+/g, ' ')  // Replace dashes with space
    .replace(/[|!]/g, '')      // Remove pipe and exclamation
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim()
  
  // Multiple patterns to try for bolivian receipts
  // Pattern 1: "LECHE DE SOYA SABO 7.70000"
  // Pattern 2: "GALLETA ORED SELEN 1290000" (no decimal)
  // Pattern 3: "LECHE DE SOYA SABO - 7 70000" (space in price)
  
  // Try to find the last number sequence (the price)
  const priceMatch = cleaned.match(/^(.+?)\s+(\d[\d\s\.,]*\d)\s*$/)
  if (priceMatch) {
    const name = cleanItemName(priceMatch[1])
    const price = normalizePrice(priceMatch[2])
    if (name.length > 1 && price > 0 && price < 5000) {
      return { price, name }
    }
  }
  
  // Fallback: just find any number at the end
  const fallbackMatch = cleaned.match(/^(.+?)\s+(\d+)\s*$/)
  if (fallbackMatch) {
    const name = cleanItemName(fallbackMatch[1])
    const price = normalizePrice(fallbackMatch[2])
    if (name.length > 1 && price > 0 && price < 5000) {
      return { price, name }
    }
  }
  
  return null
}

function parseBolivianReceipt(lines: ParsedLine[], imageUrl: string): Receipt {
  const items: ReceiptItem[] = []
  let storeName = ''
  let date = ''
  let total = 0

  const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
  const datePatternYearFirst = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  const totalPattern = /total\s*a?\s*pagar|total\s*bs\.?/i
  
  // Lines to completely skip
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
    /^\s*$/
  ]

  // First pass: find store name and date
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const text = lines[i].text.trim()
    
    // Store name - look for prominent text in first lines
    if (i < 5 && !storeName && text.length > 3) {
      const cleaned = text.replace(/\*+/g, '').trim()
      if (cleaned.length > 2 && !/factura|cr[ée]dito/i.test(cleaned) && !/^\d/.test(cleaned) && !skipPatterns.some(p => p.test(cleaned))) {
        storeName = cleaned
      }
    }
    
    // Date
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

  // Second pass: extract items
  for (let i = 0; i < lines.length; i++) {
    const { text, confidence } = lines[i]
    
    if (!text) {
      continue
    }

    // Check for total FIRST
    if (totalPattern.test(text)) {
      const priceMatch = text.match(/(\d+[\.,]\d{2})\s*$/)
      if (priceMatch) {
        total = parseFloat(priceMatch[1].replace(',', '.'))
      }
      continue
    }

    if (skipPatterns.some(p => p.test(text))) {
      continue
    }

    // Skip quantity lines or extract price if pendingItemName exists
    if (isQuantityLine(text) || /\b\d+[\.,]\d{2}\s*[xX]\s*\d+[\.,]\d{2}/i.test(text)) {
      if (pendingItemName) {
        const priceMatch = text.match(/(\d+[\.,]\d{2})\s*$/)
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'))
          if (price > 0 && price < 5000) {
            items.push({
              id: generateId(),
              name: pendingItemName,
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

    // Try to extract item from this line (NAME + PRICE format)
    const extracted = extractPriceFromEnd(text)
    if (extracted && extracted.name.length > 1 && extracted.price > 0 && extracted.price < 5000) {
      // Make sure name has at least one letter (not just numbers)
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

    // If we're here, it might be an item name awaiting its price on the next line
    const lettersMatch = text.match(/[a-zA-Z]/g)
    if (lettersMatch && lettersMatch.length > 3) {
       // Ignore info lines
       if (!/^(NIT|COD\.?CLIENTE|CUF|NOMBRE|RAZ[OÓ]N|N[O°]?FACTURA)/i.test(text)) {
           pendingItemName = text.replace(/^[\d\s\-]+/, '').trim()
       }
    }
  }

  // Calculate total if not found
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
