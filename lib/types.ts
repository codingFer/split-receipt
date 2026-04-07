export interface Buyer {
  id: string
  name: string
  color: string
  avatar?: string
}

export interface ReceiptItem {
  id: string
  name: string
  quantity: number
  price: number
  confidence: number // 0-1 OCR confidence
  assignments: ItemAssignment[]
}

export interface ItemAssignment {
  buyerId: string
  amount: number // The amount this buyer pays for this item
  splitType: 'full' | 'equal' | 'custom' | 'quantity'
}

export interface Receipt {
  id: string
  storeName: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  total: number
  imageUrl?: string
  createdAt: Date
}

export interface BuyerSummary {
  buyer: Buyer
  items: { item: ReceiptItem; amount: number }[]
  total: number
}

export type AppStep = 'buyers' | 'upload' | 'review' | 'assign' | 'summary'

export const BUYER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const
