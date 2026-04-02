"use client"

import { useState } from 'react'
import { useAppContext } from '@/lib/store'
import { BUYER_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, Trash2, Edit2, Check, X, ArrowRight, Users } from 'lucide-react'

export function BuyersStep() {
  const { buyers, addBuyer, updateBuyer, removeBuyer, setStep } = useAppContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    const usedColors = new Set(buyers.map(b => b.color))
    const availableColor = BUYER_COLORS.find(c => !usedColors.has(c)) || BUYER_COLORS[buyers.length % BUYER_COLORS.length]
    addBuyer({ name: newName.trim(), color: availableColor })
    setNewName('')
  }

  const handleEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return
    updateBuyer(editingId, { name: editingName.trim() })
    setEditingId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleColorChange = (buyerId: string, color: string) => {
    updateBuyer(buyerId, { color })
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Who&apos;s splitting?
          </CardTitle>
          <CardDescription>
            Add the people who will be splitting this receipt. You can always add more later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Add a person</FieldLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} disabled={!newName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Field>
          </FieldGroup>

          {buyers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                People ({buyers.length})
              </p>
              <div className="space-y-2">
                {buyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex gap-1">
                      {BUYER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(buyer.id, color)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            buyer.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {editingId === buyer.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span className="font-medium truncate block">{buyer.name}</span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {editingId === buyer.id ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(buyer.id, buyer.name)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeBuyer(buyer.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => setStep('upload')}
          disabled={buyers.length === 0}
          size="lg"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
