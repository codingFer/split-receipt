"use client"

import { Buyer } from "@/lib/types"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface BuyerAvatarProps {
  buyer: Buyer
  className?: string
  size?: "sm" | "md" | "lg"
  onClick?: () => void
  isSelected?: boolean
}

export function BuyerAvatar({ buyer, className, size = "md", onClick, isSelected }: BuyerAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-10",
    md: "w-12 h-16",
    lg: "w-16 h-20",
  }

  const visorSizes = {
    sm: "w-5 h-3 top-2 left-1.5",
    md: "w-8 h-5 top-3 left-2",
    lg: "w-10 h-6 top-4 left-3",
  }

  const backpackSizes = {
    sm: "w-2 h-6 -left-1 top-3",
    md: "w-3 h-10 -left-1.5 top-4",
    lg: "w-4 h-12 -left-2 top-5",
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <motion.div
        initial={{ y: -50, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.5 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn("relative rounded-t-full rounded-b-2xl border-2 border-black/20 shadow-lg", sizeClasses[size])}
        style={{ backgroundColor: buyer.color }}
      >
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
        
        {/* Shadow/Depth */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-black/10 rounded-b-2xl" />
      </motion.div>
      
      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white border border-white/10 truncate max-w-[60px] sm:max-w-[100px] shadow-sm backdrop-blur-[2px]"
      >
        {buyer.name}
      </motion.span>
    </div>
  )
}
