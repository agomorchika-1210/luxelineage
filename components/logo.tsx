"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  showSubtitle?: boolean
  variant?: "header" | "full"
}

export function Logo({ className, showSubtitle = false, variant = "header" }: LogoProps) {
  if (variant === "header") {
    return (
      <Link href="/" className={cn("font-serif text-2xl font-light tracking-wider", className)}>
        LUXELINEAGE
      </Link>
    )
  }

  return (
    <Link href="/" className={cn("flex flex-col items-start group", className)}>
      <div className="flex items-start gap-3">
        {/* Stylized "L" - represented with gold accent color matching logo */}
        <div className="relative flex-shrink-0">
          <span className="font-serif text-5xl font-bold text-accent leading-none">L</span>
          <span className="absolute -top-1 right-0 text-[10px] text-foreground/70 font-sans">®</span>
        </div>
        <div className="flex flex-col pt-1">
          <span className="font-serif text-2xl font-semibold tracking-wider leading-tight text-foreground">
            LUXE LINEAGE
          </span>
          {showSubtitle && (
            <span className="font-sans text-xs font-light tracking-[0.25em] text-foreground/90 mt-0.5">
              K L A S I C W E A R
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

