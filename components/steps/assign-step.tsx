"use client"

import { useState, useEffect } from 'react'
import { useAppContext } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  Split,
  Check,
  Users,
  User,
  Hash,
  Minus,
  Plus,
  X
} from 'lucide-react'
import type { ReceiptItem } from '@/lib/types'
import { formatCurrency } from '@/lib/currency'
import { getProductEmoji } from '@/lib/product-emoji'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type SplitMode = 'full' | 'equal' | 'custom' | 'quantity'

export function AssignStep() {
  const t = useTranslations('AssignStep')
  const { currentReceipt, buyers, assignItem, setStep } = useAppContext()
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [splitMode, setSplitMode] = useState<SplitMode>('full')
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([])
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  // Reset selections when item changes
  useEffect(() => {
    setSelectedBuyers([])
    setCustomAmounts({})
    setQuantities({})
    setSplitMode('full')
  }, [selectedItem])

  if (!currentReceipt) return null

  const handleBuyerToggle = (buyerId: string) => {
    setSelectedBuyers(prev =>
      prev.includes(buyerId)
        ? prev.filter(id => id !== buyerId)
        : [...prev, buyerId]
    )
  }

  const handleBuyerSelect = (buyerId: string) => {
    if (splitMode === 'full') {
      setSelectedBuyers([buyerId])
    } else {
      handleBuyerToggle(buyerId)
    }
  }

  const handleQuantityChange = (buyerId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[buyerId] || 0
      const newQty = Math.max(0, current + delta)

      // Add/remove from selectedBuyers based on quantity
      if (newQty > 0) {
        setSelectedBuyers(s => s.includes(buyerId) ? s : [...s, buyerId])
      } else if (newQty === 0) {
        setSelectedBuyers(s => s.filter(id => id !== buyerId))
      }

      return { ...prev, [buyerId]: newQty }
    })
  }

  const handleQuickAssign = (itemId: string, buyerId: string) => {
    assignItem(itemId, [buyerId], 'full')
  }

  const handleAssign = () => {
    if (!selectedItem || selectedBuyers.length === 0) return

    if (splitMode === 'custom') {
      const amounts: Record<string, number> = {}
      selectedBuyers.forEach(id => {
        amounts[id] = parseFloat(customAmounts[id] || '0')
      })
      assignItem(selectedItem, selectedBuyers, 'custom', amounts)
    } else if (splitMode === 'quantity') {
      assignItem(selectedItem, selectedBuyers, 'quantity', undefined, quantities)
    } else {
      assignItem(selectedItem, selectedBuyers, splitMode)
    }

    // Move to next unassigned item
    const currentIndex = currentReceipt.items.findIndex(i => i.id === selectedItem)
    const nextUnassigned = currentReceipt.items.find((item, idx) =>
      idx > currentIndex && item.assignments.length === 0
    )

    if (nextUnassigned) {
      setSelectedItem(nextUnassigned.id)
    } else {
      setSelectedItem(null)
    }
  }

  const handleEqualSplitAll = () => {
    const buyerIds = buyers.map(b => b.id)
    currentReceipt.items.forEach(item => {
      assignItem(item.id, buyerIds, 'equal')
    })
  }

  const getAssignmentBadges = (item: ReceiptItem) => {
    if (item.assignments.length === 0) return null

    // If only one person and full assignment, don't show badges (color is enough)
    if (item.assignments.length === 1 && item.assignments[0].splitType === 'full') {
      return null
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {item.assignments.map(assignment => {
          const buyer = buyers.find(b => b.id === assignment.buyerId)
          if (!buyer) return null
          return (
            <Badge
              key={assignment.buyerId}
              variant="secondary"
              className="text-xs"
              style={{ backgroundColor: `${buyer.color}30`, color: buyer.color }}
            >
              {buyer.name}: {formatCurrency(assignment.amount)}
            </Badge>
          )
        })}
      </div>
    )
  }

  // Get the background color for an item based on assignments
  const getItemBackgroundStyle = (item: ReceiptItem) => {
    if (item.assignments.length === 0) return {}

    if (item.assignments.length === 1) {
      // Single person - use their color
      const buyer = buyers.find(b => b.id === item.assignments[0].buyerId)
      if (buyer) {
        return {
          backgroundColor: `${buyer.color}15`,
          borderColor: `${buyer.color}40`
        }
      }
    } else {
      // Multiple people - create gradient
      const colors = item.assignments
        .map(a => buyers.find(b => b.id === a.buyerId)?.color)
        .filter(Boolean)

      if (colors.length >= 2) {
        const gradientStops = colors.map((c, i) =>
          `${c}20 ${(i / (colors.length - 1)) * 100}%`
        ).join(', ')

        return {
          background: `linear-gradient(135deg, ${gradientStops})`,
          borderColor: `${colors[0]}40`
        }
      }
    }

    return {}
  }

  const getAssignedTotal = () => {
    let total = 0
    currentReceipt.items.forEach(item => {
      item.assignments.forEach(a => {
        total += a.amount
      })
    })
    return total
  }

  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0)
  }

  const getPricePerUnit = () => {
    const total = getTotalQuantity()
    if (total === 0 || !selectedItemData) return 0
    return selectedItemData.price / total
  }

  const allItemsAssigned = currentReceipt.items.every(item => item.assignments.length > 0)
  const selectedItemData = currentReceipt.items.find(i => i.id === selectedItem)

  const splitModes: { value: SplitMode; label: string; icon: typeof User; description: string }[] = [
    { value: 'full', label: t('modes.full.label'), icon: User, description: t('modes.full.description') },
    { value: 'equal', label: t('modes.equal.label'), icon: Users, description: t('modes.equal.description') },
    { value: 'quantity', label: t('modes.quantity.label'), icon: Hash, description: t('modes.quantity.description') },
    { value: 'custom', label: t('modes.custom.label'), icon: Split, description: t('modes.custom.description') },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Split className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>
              {t('selectItem')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleEqualSplitAll}
            >
              <Users className="mr-2 h-4 w-4" />
              {t('splitAllEqual')}
            </Button>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {currentReceipt.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedItem === item.id && "ring-2 ring-primary border-primary",
                    selectedItem !== item.id && "hover:border-primary/50"
                  )}
                  style={selectedItem !== item.id ? getItemBackgroundStyle(item) : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getProductEmoji(item.name)}</span>
                        <span className="font-medium truncate">{item.name}</span>
                        {item.assignments.length > 0 && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      {getAssignmentBadges(item)}
                    </div>
                    <span className="font-mono font-medium ml-2">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  {/* Quick Assign Buttons */}
                  {item.assignments.length === 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {buyers.map(buyer => (
                        <button
                          key={buyer.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickAssign(item.id, buyer.id)
                          }}
                          className="px-2 py-1 text-xs rounded-md transition-colors hover:opacity-80"
                          style={{
                            backgroundColor: `${buyer.color}20`,
                            color: buyer.color,
                            border: `1px solid ${buyer.color}40`
                          }}
                        >
                          {buyer.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-muted-foreground">{t('assigned')}</span>
              <span className="font-mono">
                {formatCurrency(getAssignedTotal())} / {formatCurrency(currentReceipt.items.reduce((s, i) => s + i.price, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedItemData && <span className="text-xl">{getProductEmoji(selectedItemData.name)}</span>}
                  {selectedItemData ? selectedItemData.name : t('selectAnItem')}
                </CardTitle>
                <CardDescription>
                  {selectedItemData
                    ? formatCurrency(selectedItemData.price)
                    : t('clickListItem')
                  }
                </CardDescription>
              </div>
              {selectedItem && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedItemData ? (
              <div className="space-y-4">
                {/* Split Mode Selection */}
                <div className="grid grid-cols-2 gap-2">
                  {splitModes.map(mode => (
                    <button
                      key={mode.value}
                      onClick={() => {
                        setSplitMode(mode.value)
                        setSelectedBuyers([])
                        setQuantities({})
                        setCustomAmounts({})
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        splitMode === mode.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/30"
                      )}
                    >
                      <mode.icon className="h-4 w-4 mb-1" />
                      <div className="font-medium text-sm">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.description}</div>
                    </button>
                  ))}
                </div>

                {/* Buyer Selection based on mode */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {splitMode === 'full' && t('instructions.full')}
                    {splitMode === 'equal' && t('instructions.equal')}
                    {splitMode === 'quantity' && t('instructions.quantity')}
                    {splitMode === 'custom' && t('instructions.custom')}
                  </p>

                  <div className="space-y-2">
                    {buyers.map(buyer => {
                      const isSelected = selectedBuyers.includes(buyer.id)
                      const qty = quantities[buyer.id] || 0

                      return (
                        <div
                          key={buyer.id}
                          className={cn(
                            "rounded-lg border-2 transition-all overflow-hidden",
                            isSelected ? "border-primary" : "border-muted"
                          )}
                          style={{ backgroundColor: `${buyer.color}08` }}
                        >
                          {/* Main buyer row - clickable for full/equal modes */}
                          <button
                            onClick={() => handleBuyerSelect(buyer.id)}
                            className={cn(
                              "w-full p-3 flex items-center gap-3 text-left",
                              (splitMode === 'quantity' || splitMode === 'custom') && "pointer-events-none"
                            )}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                              style={{ backgroundColor: buyer.color }}
                            >
                              {buyer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{buyer.name}</div>
                              {splitMode === 'equal' && isSelected && selectedBuyers.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(selectedItemData.price / selectedBuyers.length)}
                                </div>
                              )}
                              {splitMode === 'full' && isSelected && (
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(selectedItemData.price)}
                                </div>
                              )}
                            </div>
                            {(splitMode === 'full' || splitMode === 'equal') && isSelected && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </button>

                          {/* Quantity controls */}
                          {splitMode === 'quantity' && (
                            <div className="px-3 pb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleQuantityChange(buyer.id, -1)}
                                  disabled={qty === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center font-mono font-medium">
                                  {qty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleQuantityChange(buyer.id, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              {qty > 0 && getTotalQuantity() > 0 && (
                                <span className="text-sm font-mono text-muted-foreground">
                                  {formatCurrency(qty * getPricePerUnit())}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Custom amount input */}
                          {splitMode === 'custom' && (
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{t('currencySymbol')}</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={customAmounts[buyer.id] || ''}
                                  onChange={(e) => {
                                    setCustomAmounts(prev => ({ ...prev, [buyer.id]: e.target.value }))
                                    if (e.target.value) {
                                      setSelectedBuyers(prev => prev.includes(buyer.id) ? prev : [...prev, buyer.id])
                                    } else {
                                      setSelectedBuyers(prev => prev.filter(id => id !== buyer.id))
                                    }
                                  }}
                                  className="flex-1"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Summary for quantity mode */}
                  {splitMode === 'quantity' && getTotalQuantity() > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('totalUnits')}</span>
                        <span className="font-mono">{getTotalQuantity()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('pricePerUnit')}</span>
                        <span className="font-mono">{formatCurrency(getPricePerUnit())}</span>
                      </div>
                    </div>
                  )}

                  {/* Summary for custom mode */}
                  {splitMode === 'custom' && (() => {
                    const customTotal = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                    const remaining = selectedItemData.price - customTotal;
                    
                    return (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('totalAssigned')}</span>
                          <span className={cn(
                            "font-mono",
                            customTotal > selectedItemData.price + 0.01
                              ? "text-destructive font-bold"
                              : Math.abs(customTotal - selectedItemData.price) > 0.01
                              ? "text-orange-500"
                              : "text-primary"
                          )}>
                            {formatCurrency(customTotal)} / {formatCurrency(selectedItemData.price)}
                          </span>
                        </div>
                        {customTotal > selectedItemData.price + 0.01 && (
                          <div className="text-xs text-destructive text-right">
                            {t('exceedsTotal')}
                          </div>
                        )}
                        {remaining > 0.01 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('remaining')}</span>
                            <span className="font-mono text-orange-500">
                              {formatCurrency(remaining)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAssign}
                  disabled={
                    selectedBuyers.length === 0 || 
                    (splitMode === 'custom' && Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0) > selectedItemData.price + 0.01)
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t('assignItem')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Split className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('selectItem')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('review')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button
          onClick={() => setStep('summary')}
          disabled={!allItemsAssigned}
          size="lg"
        >
          {t('viewSummary')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
