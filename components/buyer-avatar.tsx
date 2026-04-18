"use client"

import { Buyer } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface BuyerAvatarProps {
  buyer: Buyer
  className?: string
  size?: "xs" | "sm" | "md" | "lg"
  onClick?: () => void
  isSelected?: boolean
  isDead?: boolean
  hideName?: boolean
}

export function BuyerAvatar({ buyer, className, size = "md", onClick, isSelected, isDead, hideName = false }: BuyerAvatarProps) {
  const sizeClasses = {
    xs: isDead ? "w-4 h-2.5" : "w-4 h-5",
    sm: isDead ? "w-8 h-5" : "w-8 h-10",
    md: isDead ? "w-12 h-8" : "w-12 h-16",
    lg: isDead ? "w-16 h-10" : "w-16 h-20",
  }

  const visorSizes = {
    xs: "w-2.5 h-1.5 top-1 left-0.5",
    sm: "w-5 h-3 top-2 left-1.5",
    md: "w-8 h-5 top-3 left-2",
    lg: "w-10 h-6 top-4 left-3",
  }

  const backpackSizes = {
    xs: "w-1 h-3 -left-0.5 top-1.5",
    sm: "w-2 h-6 -left-1 top-3",
    md: "w-3 h-10 -left-1.5 top-4",
    lg: "w-4 h-12 -left-2 top-5",
  }

  const boneSizes = {
    xs: "w-1.5 h-1.5 -top-0.5",
    sm: "w-3 h-3 -top-1.5",
    md: "w-4 h-4 -top-2",
    lg: "w-5 h-5 -top-2.5",
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <motion.div
        animate={isDead ? { 
          rotate: [0, -5, 5, -5, 0],
          scale: [1, 1.1, 1],
        } : {}}
        transition={{ 
          duration: isDead ? 0.3 : 0, 
          ease: "easeInOut"
        }}
        className={cn(
          "relative border-2 border-black/20 shadow-lg transition-all duration-300", 
          isDead ? "rounded-b-2xl rounded-t-none" : "rounded-t-full rounded-b-2xl",
          sizeClasses[size]
        )}
        style={{ backgroundColor: buyer.color }}
      >
        {isDead && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/20" />
        )}
        {!isDead && (
          <>
            {/* Visor */}
            <div 
              className={cn("absolute rounded-full border border-black/10 bg-sky-200/80 backdrop-blur-sm shadow-inner", visorSizes[size])}
            >
              {/* Shine on visor */}
              <div className="absolute top-1 left-1.5 w-1/2 h-1/3 bg-white/40 rounded-full" />
            </div>
            
            {/* Backpack */}
            <div 
              className={cn("absolute rounded-l-md border-r-0 border-2 border-black/10", backpackSizes[size])}
              style={{ backgroundColor: buyer.color }}
            />
          </>
        )}

        {isDead && (
          <div className={cn("absolute left-1/2 -translate-x-1/2 flex flex-col items-center", boneSizes[size])}>
             <div className="w-2 h-full bg-slate-100 rounded-full border-2 border-black/20 z-10" />
             <div className="flex -mt-2 gap-0.5">
               <div className="w-3 h-3 bg-slate-100 rounded-full border-2 border-black/20" />
               <div className="w-3 h-3 bg-slate-100 rounded-full border-2 border-black/20" />
             </div>
          </div>
        )}
        
        {/* Shadow/Depth */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-black/10 rounded-b-2xl" />
      </motion.div>
      
      {!hideName && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white border border-white/10 truncate max-w-[60px] sm:max-w-[100px] shadow-sm backdrop-blur-[2px]"
        >
          {buyer.name}
        </motion.span>
      )}
    </div>
  )
}
