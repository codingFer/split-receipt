"use client"

import { createContext, useContext } from 'react'
import type { Buyer, Receipt, ReceiptItem, AppStep, BuyerSummary } from './types'

export interface AppState {
  buyers: Buyer[]
  currentReceipt: Receipt | null
  currentStep: AppStep
  isProcessing: boolean
}

export interface AppActions {
  addBuyer: (buyer: Omit<Buyer, 'id'> & { id?: string }) => void
  updateBuyer: (id: string, updates: Partial<Buyer>) => void
  removeBuyer: (id: string) => void
  setReceipt: (receipt: Receipt | null) => void
  updateItem: (itemId: string, updates: Partial<ReceiptItem>) => void
  addItem: (item: Omit<ReceiptItem, 'id'>) => void
  removeItem: (itemId: string) => void
  assignItem: (itemId: string, buyerIds: string[], splitType: 'full' | 'equal' | 'custom' | 'quantity', customAmounts?: Record<string, number>, quantities?: Record<string, number>) => void
  setStep: (step: AppStep) => void
  setProcessing: (isProcessing: boolean) => void
  calculateSummaries: () => BuyerSummary[]
  reset: () => void
}

export type AppContextType = AppState & AppActions

export const AppContext = createContext<AppContextType | null>(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
