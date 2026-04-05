"use client"

import { useState } from 'react'
import { useAppContext } from '@/lib/store'
import { createManualReceipt } from '@/lib/ocr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { getProductEmoji } from '@/lib/product-emoji'
import { useTranslations } from 'next-intl'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export function ReviewStep() {
  const t = useTranslations('ReviewStep')
  const { currentReceipt, setReceipt, updateItem, addItem, removeItem, setStep } = useAppContext()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', quantity: '' })
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' })

  // Create a receipt if none exists
  if (!currentReceipt) {
    setReceipt(createManualReceipt())
    return null
  }

  const handleEditStart = (item: typeof currentReceipt.items[0]) => {
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      price: item.price.toFixed(2),
      quantity: item.quantity.toString()
    })
  }

  const handleEditSave = () => {
    if (!editingId) return
    updateItem(editingId, {
      name: editForm.name,
      price: parseFloat(editForm.price) || 0,
      quantity: parseInt(editForm.quantity) || 1
    })
    setEditingId(null)
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) return
    addItem({
      name: newItem.name,
      price: parseFloat(newItem.price) || 0,
      quantity: parseInt(newItem.quantity) || 1,
      confidence: 1,
      assignments: []
    })
    setNewItem({ name: '', price: '', quantity: '1' })
  }

  const handleStoreUpdate = (field: 'storeName' | 'date', value: string) => {
    setReceipt({ ...currentReceipt, [field]: value })
  }

  const calculateTotal = () => {
    return currentReceipt.items.reduce((sum, item) => sum + item.price, 0)
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="secondary" className="text-xs">{t('confidence.high')}</Badge>
    if (confidence >= 0.5) return <Badge variant="outline" className="text-xs">{t('confidence.medium')}</Badge>
    return (
      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t('confidence.low')}
      </Badge>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store Info */}
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{t('storeName')}</FieldLabel>
                <Input
                  value={currentReceipt.storeName}
                  onChange={(e) => handleStoreUpdate('storeName', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>{t('date')}</FieldLabel>
                <Input
                  value={currentReceipt.date}
                  onChange={(e) => handleStoreUpdate('date', e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>

          {/* Items List */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {t('itemsCount', { count: currentReceipt.items.length })}
            </p>

            {currentReceipt.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noItems')}
              </div>
            ) : (
              <div className="space-y-2">
                {currentReceipt.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-4 bg-card"
                  >
                    {editingId === item.id ? (
                      <>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                            placeholder={t('placeholders.name')}
                            className="col-span-1 sm:col-span-2 w-full"
                          />
                          <div className="flex gap-2">
                            <Input
                              value={editForm.quantity}
                              onChange={(e) => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                              placeholder={t('placeholders.qty')}
                              type="number"
                              className="w-16 sm:w-20"
                            />
                            <Input
                              value={editForm.price}
                              onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))}
                              placeholder={t('placeholders.price')}
                              type="number"
                              step="0.01"
                              className="w-20 sm:w-24"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          <Button size="icon" variant="ghost" onClick={handleEditSave}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className="text-lg">{getProductEmoji(item.name)}</span>
                            <span className="font-medium truncate">{item.name}</span>
                            {item.confidence < 1 && getConfidenceBadge(item.confidence)}
                          </div>
                          {item.quantity > 1 && (
                            <span className="text-sm text-muted-foreground">
                              {t('placeholders.qty')}: {item.quantity}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center gap-2 mt-2 sm:mt-0">
                          <span className="font-mono font-medium mt-1 sm:mt-0">
                            {formatCurrency(item.price)}
                          </span>
                          <div>
                            <Button size="icon" variant="ghost" onClick={() => handleEditStart(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Item */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem(n => ({ ...n, name: e.target.value }))}
                placeholder={t('placeholders.itemName')}
                className="flex-1"
              />
              <Input
                value={newItem.quantity}
                onChange={(e) => setNewItem(n => ({ ...n, quantity: e.target.value }))}
                placeholder={t('placeholders.qty')}
                type="number"
                className="w-16"
              />
              <Input
                value={newItem.price}
                onChange={(e) => setNewItem(n => ({ ...n, price: e.target.value }))}
                placeholder={t('placeholders.price')}
                type="number"
                step="0.01"
                className="w-24"
              />
              <Button onClick={handleAddItem} disabled={!newItem.name || !newItem.price}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-medium">{t('total')}</span>
            <span className="text-xl font-bold font-mono">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
        </CardContent>
      </Card>

      {currentReceipt.imageUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('originalReceipt')}</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={currentReceipt.imageUrl}
              alt="Receipt"
              className="max-h-64 mx-auto rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('upload')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button
          onClick={() => setStep('assign')}
          disabled={currentReceipt.items.length === 0}
          size="lg"
        >
          {t('assignItems')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
