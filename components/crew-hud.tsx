"use client"

import { useAppContext } from "@/lib/store"
import { BuyerAvatar } from "./buyer-avatar"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CrewHUDProps {
  className?: string
  variant?: "lobby" | "compact"
}

export function CrewHUD({ className, variant = "compact" }: CrewHUDProps) {
  const { buyers } = useAppContext()
  const t = useTranslations("BuyersStep")

  if (variant === "lobby") {
    return (
      <div className={cn("flex flex-col items-end gap-2", className)}>
        <div className="bg-black/60 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
          <div className="w-1.5 h-1.5 sm:w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-white/90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
            {t("playersJoined", { count: buyers.length })}
          </span>
        </div>

        {/* Mini Crewmate Icons */}
        <div className="flex flex-wrap justify-end gap-1 sm:gap-1.5 px-1 max-w-[100px] sm:max-w-[200px]">
          <AnimatePresence mode="popLayout">
            {buyers.map((buyer) => (
              <motion.div
                key={buyer.id}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 10 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <BuyerAvatar buyer={buyer} size="xs" hideName />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex -space-x-1.5">
        <AnimatePresence mode="popLayout">
          {buyers.map((buyer, idx) => (
            <Popover key={buyer.id}>
              <PopoverTrigger asChild>
                <motion.button
                  initial={{ scale: 0, opacity: 0, x: 10 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0, opacity: 0, x: 10 }}
                  className="relative z-10 focus:outline-none touch-manipulation"
                  style={{ zIndex: buyers.length - idx }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-background shadow-md overflow-hidden flex items-center justify-center transition-transform hover:scale-110 active:scale-95" style={{ backgroundColor: buyer.color }}>
                    <BuyerAvatar buyer={buyer} size="xs" hideName className="mt-1" />
                  </div>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="center" className="w-auto px-3 py-1.5 rounded-xl shadow-xl border-2 font-bold text-xs bg-popover text-popover-foreground">
                {buyer.name}
              </PopoverContent>
            </Popover>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
