"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppContext } from '@/lib/store'
import { BUYER_COLORS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Plus, Trash2, Edit2, Check, X, ArrowRight, Users, Sparkles, Settings2, Calendar, Clock, ArrowUpRight, FileUp, Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { BuyerAvatar } from '@/components/buyer-avatar'
import { CrewHUD } from '@/components/crew-hud'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function BuyersStep() {
  const t = useTranslations('BuyersStep')
  const { 
    buyers, 
    addBuyer, 
    updateBuyer, 
    removeBuyer, 
    setStep, 
    calculateSummaries, 
    reset,
    history,
    currentSessionId,
    resumeSession,
    deleteSession,
    startNewSession,
    importState,
    exportState
  } = useAppContext()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [lastJoinedId, setLastJoinedId] = useState<string | null>(null)
  const [dyingId, setDyingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      importState(content)
    }
    reader.readAsText(file)
  }

  const handleDownload = (session: any) => {
    const data = JSON.stringify(session, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.name.replace(/\s+/g, '_')}_split.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    const usedColors = new Set(buyers.map(b => b.color))
    const availableColor = BUYER_COLORS.find(c => !usedColors.has(c)) || BUYER_COLORS[buyers.length % BUYER_COLORS.length]
    const id = crypto.randomUUID()
    addBuyer({ id, name: newName.trim(), color: availableColor })
    setNewName('')
    setLastJoinedId(id)
    inputRef.current?.focus()
    setTimeout(() => setLastJoinedId(null), 2000)
  }

  const handleEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
  }

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return
    updateBuyer(id, { name: editingName.trim() })
    setEditingId(null)
  }

  const handleRemove = (id: string) => {
    setDyingId(id)
    // Wait for the "kill" animation to play (red flash/shake)
    setTimeout(() => {
      removeBuyer(id)
      setDyingId(null)
    }, 1200) // Slightly longer to let the animation feel impactful
  }

  const handleColorChange = (buyerId: string, color: string) => {
    updateBuyer(buyerId, { color })
  }

  const handleContinue = () => {
    if (newName.trim()) {
      handleAdd()
    }
    
    if (currentSessionId) {
      setStep('upload')
    } else {
      startNewSession()
    }
  }

  // Memoize stars so they don't regenerate while typing
  const stars = useMemo(() => {
    if (!mounted) return []
    return [...Array(20)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.5 + 0.2,
    }))
  }, [mounted, buyers.length])

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 px-2 sm:px-0">
      {/* Header Info */}
      <div className="flex flex-col gap-1 px-2">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
          <Users className="w-6 h-6 sm:w-8 h-8 text-primary" />
          {t('title')}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base font-medium">
          {t('lobbyDescription')}
        </p>
      </div>
      

      {/* Integrated Lobby Area */}
      <div className="relative w-full aspect-[16/11] sm:aspect-[21/9] bg-slate-950 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-4 border-slate-900 shadow-2xl overflow-x-auto ring-1 ring-white/5">
        {/* Space Background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
          {stars.map((star: any) => (
            <div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: star.top,
                left: star.left,
                animationDelay: star.delay,
                opacity: star.opacity
              }}
            />
          ))}
        </div>

        {/* Floor Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-slate-900/40 border-t border-white/5" />

        {/* Death Flash Effect */}
        <AnimatePresence>
          {dyingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-red-600 z-40 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Player Count HUD (Top Right) */}
        <CrewHUD variant="lobby" className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20" />

        {/* Characters Container */}
        <motion.div
          animate={dyingId ? {
            x: [0, -4, 4, -4, 4, 0],
          } : {}}
          transition={{ duration: 0.4 }}
          className="relative h-full flex items-end justify-center pb-20 sm:pb-24 px-4 gap-2 sm:gap-8 min-w-max mx-auto overflow-visible"
        >
          <AnimatePresence mode="popLayout">
            {buyers.map((buyer) => (
              <motion.div
                key={buyer.id}
                layout
                initial={{ y: -200, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 50, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="z-10 relative px-1 sm:px-0"
              >
                {/* Kill Animation Overlay */}
                <AnimatePresence>
                  {dyingId === buyer.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: [1, 1.5, 1.2] }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-x-0 -top-4 bottom-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                      <div className="relative w-full h-full flex items-center justify-center">
                        <motion.div
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="absolute w-full h-1 bg-red-600 rotate-45 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                        />
                        <motion.div
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          className="absolute w-full h-1 bg-red-600 -rotate-45 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                        />
                        <motion.div
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="absolute inset-0 bg-red-600/20 rounded-full blur-xl"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {lastJoinedId === buyer.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -45 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap z-50 ring-2 ring-white/20 uppercase tracking-tighter sm:tracking-wider animate-bounce"
                  >
                    {t('joined')}
                  </motion.div>
                )}

                <Popover onOpenChange={(open) => {
                  if (open) {
                    setEditingId(buyer.id)
                    setEditingName(buyer.name)
                  } else {
                    setEditingId(null)
                  }
                }}>
                  <PopoverTrigger asChild>
                    <button className="transition-transform active:scale-95 group relative touch-manipulation focus:outline-none">
                      <div className="absolute -top-2 -right-1 sm:-right-2 opacity-0 sm:group-hover:opacity-100 transition-opacity bg-primary rounded-full p-1 shadow-lg ring-2 ring-background z-20">
                        <Settings2 className="w-2.5 h-2.5 sm:w-3 h-3 text-white" />
                      </div>
                      <div className="hidden sm:block">
                        <BuyerAvatar buyer={buyer} size="lg" isDead={dyingId === buyer.id} />
                      </div>
                      <div className="sm:hidden">
                        <BuyerAvatar buyer={buyer} size="md" isDead={dyingId === buyer.id} />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4 rounded-2xl shadow-2xl border-2 border-slate-100 dark:border-slate-800" sideOffset={12}>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('nameLabel')}</label>
                          <div className="flex gap-1.5">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(buyer.id)}
                              className="h-9 font-medium rounded-xl"
                            />
                            <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={() => handleSaveEdit(buyer.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('colorLabel')}</label>
                          <div className="flex flex-wrap gap-2">
                            {BUYER_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => handleColorChange(buyer.id, color)}
                                className={`w-7 h-7 rounded-full transition-all duration-300 ring-offset-2 ${buyer.color === color
                                  ? 'ring-2 ring-primary scale-110 shadow-md'
                                  : 'hover:scale-110 opacity-70 hover:opacity-100'
                                  }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t mt-3 flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg h-9 px-3 font-semibold"
                            disabled={dyingId !== null}
                            onClick={() => handleRemove(buyer.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('deleteAction')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </motion.div>
            ))}
          </AnimatePresence>

          {buyers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium italic">
              <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-sm">{t('waitingForPlayers')}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Floating Input Bar Overlay */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 sm:px-6 z-30">
          <div className="flex gap-2 bg-black/60 backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/5">
            <Input
              ref={inputRef}
              placeholder={t('placeholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-10 text-white border-none focus-visible:ring-0 bg-transparent placeholder:text-slate-500 font-medium text-sm sm:text-base"
            />
            <Button
              onClick={handleAdd}
              disabled={!newName.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 shrink-0 transition-all active:scale-90"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleContinue}
          disabled={buyers.length === 0 && !newName.trim()}
          size="lg"
          className="w-full sm:w-auto rounded-2xl px-12 h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group bg-primary text-white"
        >
          {t('continue')}
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* History Section moved to bottom */}
      <AnimatePresence>
        {mounted && (history?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-8"
          >
               <div className="flex items-center justify-between px-2 mb-3 pt-6 border-t border-border/50">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Clock className="w-4 h-4" />
                   {t('history')}
                 </h3>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => fileInputRef.current?.click()}
                   className="text-[10px] font-bold uppercase tracking-wider h-7 px-3 rounded-lg border-primary/20 hover:bg-primary/5 text-primary"
                 >
                   <FileUp className="w-3 h-3 mr-1.5" />
                   {t('importData')}
                 </Button>
                 <input
                   type="file"
                   ref={fileInputRef}
                   className="hidden"
                   accept=".json"
                   onChange={handleImport}
                 />
               </div>
               <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar pb-10">
                 {history.map((session) => (
                   <div 
                     key={session.id} 
                     className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-[1.5rem] transition-all border shadow-sm gap-3 ${
                       currentSessionId === session.id 
                         ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' 
                         : 'bg-muted/40 border-border/50 hover:bg-muted/60 hover:border-primary/30'
                     }`}
                   >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="font-bold text-sm sm:text-base flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="truncate max-w-[180px] sm:max-w-none">{session.name}</span>
                          {currentSessionId === session.id && (
                            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse shrink-0">
                              <Sparkles className="w-2.5 h-2.5" />
                              Activo
                            </span>
                          )}
                          <span className="text-[9px] sm:text-[10px] bg-muted-foreground/10 text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold shrink-0">
                            {session.step}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] sm:text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                           <div className="flex items-center gap-1">
                             <Calendar className="w-3 h-3" />
                             <span className="text-muted-foreground">{t('createdAtLabel')}:</span>
                             <span className="text-foreground">{new Date(session.createdAt).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-1">
                             <Clock className="w-3 h-3" />
                             <span className="text-muted-foreground">{t('updatedAtLabel')}:</span>
                             <span className="text-foreground">{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                         {currentSessionId !== session.id && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => resumeSession(session.id)}
                             className="text-[10px] sm:text-xs font-bold text-primary hover:bg-primary/10 rounded-xl px-3 h-8 sm:h-9"
                           >
                             {t('resume')}
                             <ArrowUpRight className="ml-1.5 w-3.5 h-3.5" />
                           </Button>
                         )}
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleDownload(session)}
                           className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-primary rounded-xl"
                         >
                           <Download className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => deleteSession(session.id)}
                           className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive rounded-xl"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                   </div>
                 ))}
               </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
