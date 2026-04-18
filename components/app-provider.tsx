"use client"

import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import { AppContext, type AppState } from '@/lib/store'
import type { Buyer, Receipt, ReceiptItem, AppStep, BuyerSummary, ItemAssignment } from '@/lib/types'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

const STORAGE_KEY = 'split-receipt-state'

const initialState: AppState = {
  history: [],
  currentSessionId: null,
  buyers: [],
  currentReceipt: null,
  currentStep: 'buyers',
  isProcessing: false,
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // Only restore history, reset active session to clean slate
        setState({ 
          ...initialState, 
          history: parsed.history || [], 
          isProcessing: false 
        })
      } catch (e) {
        console.error('Failed to parse saved state', e)
      }
    }
    setIsHydrated(true)
  }, [])

  // Save state to localStorage on changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, isHydrated])

  // Sync current session with history
  useEffect(() => {
    if (isHydrated && state.currentSessionId) {
      const sessionIdx = state.history.findIndex(s => s.id === state.currentSessionId)
      if (sessionIdx !== -1) {
        const currentSession = state.history[sessionIdx]
        const newName = state.currentReceipt?.storeName || currentSession.name

        if (
          currentSession.buyers !== state.buyers ||
          currentSession.receipt !== state.currentReceipt ||
          currentSession.step !== state.currentStep ||
          currentSession.name !== newName
        ) {
          const updatedSession = {
            ...currentSession,
            buyers: state.buyers,
            receipt: state.currentReceipt,
            step: state.currentStep,
            updatedAt: new Date().toISOString(),
            name: newName
          }

          setState(prev => {
            const newHistory = [...prev.history]
            newHistory[sessionIdx] = updatedSession
            return { ...prev, history: newHistory }
          })
        }
      }
    }
  }, [state.buyers, state.currentReceipt, state.currentStep, state.currentSessionId, isHydrated])

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

  const duplicateItem = useCallback((itemId: string) => {
    setState(prev => {
      if (!prev.currentReceipt) return prev
      const items = prev.currentReceipt.items
      const index = items.findIndex(i => i.id === itemId)
      if (index === -1) return prev

      const item = items[index]
      const newItem: ReceiptItem = {
        ...item,
        id: generateId(),
        name: `${item.name} (copy)`,
        assignments: []
      }

      const newItems = [...items]
      newItems.splice(index + 1, 0, newItem)

      return {
        ...prev,
        currentReceipt: {
          ...prev.currentReceipt,
          items: newItems
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

  const startNewSession = useCallback(() => {
    const id = generateId()
    const now = new Date().toISOString()
    const newSession = {
      id,
      name: state.currentReceipt?.storeName || `Split ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      buyers: state.buyers,
      receipt: state.currentReceipt,
      step: 'upload',
    }
    
    setState(prev => ({
      ...prev,
      currentSessionId: id,
      history: [newSession, ...prev.history],
      currentStep: 'upload'
    }))
  }, [state.buyers, state.currentReceipt])

  const resumeSession = useCallback((id: string) => {
    setState(prev => {
      const session = prev.history.find(s => s.id === id)
      if (!session) return prev
      return {
        ...prev,
        currentSessionId: id,
        buyers: session.buyers,
        currentReceipt: session.receipt,
        currentStep: session.step,
      }
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      history: prev.history.filter(s => s.id !== id),
      currentSessionId: prev.currentSessionId === id ? null : prev.currentSessionId
    }))
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
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const exportState = useCallback(() => {
    if (!state.currentSessionId) {
      // Create a temporary session if none exists
      const now = new Date().toISOString()
      const session = {
        id: generateId(),
        name: state.currentReceipt?.storeName || `Export ${new Date().toLocaleDateString()}`,
        createdAt: now,
        updatedAt: now,
        buyers: state.buyers,
        receipt: state.currentReceipt,
        step: state.currentStep,
      }
      return JSON.stringify(session)
    }
    
    const session = state.history.find(s => s.id === state.currentSessionId)
    return session ? JSON.stringify(session) : null
  }, [state])

  const importState = useCallback((encoded: string) => {
    try {
      const session = JSON.parse(encoded)
      if (session.id && Array.isArray(session.buyers)) {
        setState(prev => ({
          ...prev,
          history: [session, ...prev.history.filter(s => s.id !== session.id)]
        }))
        return true
      }
    } catch (e) {
      console.error('Import failed', e)
    }
    return false
  }, [])


  const value = useMemo(() => ({
    ...state,
    addBuyer,
    updateBuyer,
    removeBuyer,
    setReceipt,
    updateItem,
    addItem,
    duplicateItem,
    removeItem,
    assignItem,
    setStep,
    setProcessing,
    startNewSession,
    resumeSession,
    deleteSession,
    calculateSummaries,
    reset,
    exportState,
    importState,
  }), [state, addBuyer, updateBuyer, removeBuyer, setReceipt, updateItem, addItem, duplicateItem, removeItem, assignItem, setStep, setProcessing, startNewSession, resumeSession, deleteSession, calculateSummaries, reset, exportState, importState])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}
