"use client"

import { useState, useCallback, useMemo, type ReactNode } from 'react'
import { AppContext, type AppState } from '@/lib/store'
import type { Buyer, Receipt, ReceiptItem, AppStep, BuyerSummary, ItemAssignment } from '@/lib/types'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

const initialState: AppState = {
  buyers: [],
  currentReceipt: null,
  currentStep: 'buyers',
  isProcessing: false,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)

  const addBuyer = useCallback((buyer: Omit<Buyer, 'id'> & { id?: string }) => {
    const newBuyer: Buyer = { ...buyer, id: buyer.id || generateId() }
    setState(prev => ({ ...prev, buyers: [...prev.buyers, newBuyer] }))
  }, [])

  const updateBuyer = useCallback((id: string, updates: Partial<Buyer>) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.map(b => b.id === id ? { ...b, ...updates } : b)
    }))
  }, [])

  const removeBuyer = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.filter(b => b.id !== id),
      currentReceipt: prev.currentReceipt ? {
        ...prev.currentReceipt,
        items: prev.currentReceipt.items.map(item => ({
          ...item,
          assignments: item.assignments.filter(a => a.buyerId !== id)
        }))
      } : null
    }))
  }, [])

  const setReceipt = useCallback((receipt: Receipt | null) => {
    setState(prev => ({ ...prev, currentReceipt: receipt }))
  }, [])

  const updateItem = useCallback((itemId: string, updates: Partial<ReceiptItem>) => {
    setState(prev => {
      if (!prev.currentReceipt) return prev
      return {
        ...prev,
        currentReceipt: {
          ...prev.currentReceipt,
          items: prev.currentReceipt.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        }
      }
    })
  }, [])

  const addItem = useCallback((item: Omit<ReceiptItem, 'id'>) => {
    setState(prev => {
      if (!prev.currentReceipt) return prev
      const newItem: ReceiptItem = { ...item, id: generateId() }
      return {
        ...prev,
        currentReceipt: {
          ...prev.currentReceipt,
          items: [...prev.currentReceipt.items, newItem]
        }
      }
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setState(prev => {
      if (!prev.currentReceipt) return prev
      return {
        ...prev,
        currentReceipt: {
          ...prev.currentReceipt,
          items: prev.currentReceipt.items.filter(item => item.id !== itemId)
        }
      }
    })
  }, [])

  const assignItem = useCallback((
    itemId: string,
    buyerIds: string[],
    splitType: 'full' | 'equal' | 'custom' | 'quantity',
    customAmounts?: Record<string, number>,
    quantities?: Record<string, number>
  ) => {
    setState(prev => {
      if (!prev.currentReceipt) return prev
      
      const item = prev.currentReceipt.items.find(i => i.id === itemId)
      if (!item) return prev

      let assignments: ItemAssignment[] = []

      if (splitType === 'full' && buyerIds.length === 1) {
        assignments = [{ buyerId: buyerIds[0], amount: item.price, splitType: 'full' }]
      } else if (splitType === 'equal') {
        const splitAmount = item.price / buyerIds.length
        assignments = buyerIds.map(buyerId => ({
          buyerId,
          amount: splitAmount,
          splitType: 'equal'
        }))
      } else if (splitType === 'custom' && customAmounts) {
        assignments = buyerIds.map(buyerId => ({
          buyerId,
          amount: customAmounts[buyerId] || 0,
          splitType: 'custom'
        }))
      } else if (splitType === 'quantity' && quantities) {
        // Calculate price per unit based on total quantities
        const totalQuantity = Object.values(quantities).reduce((sum, q) => sum + q, 0)
        const pricePerUnit = totalQuantity > 0 ? item.price / totalQuantity : 0
        
        assignments = buyerIds.map(buyerId => ({
          buyerId,
          amount: (quantities[buyerId] || 0) * pricePerUnit,
          splitType: 'quantity'
        }))
      }

      return {
        ...prev,
        currentReceipt: {
          ...prev.currentReceipt,
          items: prev.currentReceipt.items.map(i =>
            i.id === itemId ? { ...i, assignments } : i
          )
        }
      }
    })
  }, [])

  const setStep = useCallback((step: AppStep) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }, [])

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({ ...prev, isProcessing }))
  }, [])

  const calculateSummaries = useCallback((): BuyerSummary[] => {
    if (!state.currentReceipt) return []

    return state.buyers.map(buyer => {
      const items: { item: ReceiptItem; amount: number }[] = []
      let total = 0

      for (const item of state.currentReceipt!.items) {
        const assignment = item.assignments.find(a => a.buyerId === buyer.id)
        if (assignment) {
          items.push({ item, amount: assignment.amount })
          total += assignment.amount
        }
      }

      return { buyer, items, total }
    })
  }, [state.buyers, state.currentReceipt])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const value = useMemo(() => ({
    ...state,
    addBuyer,
    updateBuyer,
    removeBuyer,
    setReceipt,
    updateItem,
    addItem,
    removeItem,
    assignItem,
    setStep,
    setProcessing,
    calculateSummaries,
    reset,
  }), [state, addBuyer, updateBuyer, removeBuyer, setReceipt, updateItem, addItem, removeItem, assignItem, setStep, setProcessing, calculateSummaries, reset])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
