"use client"

import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface LogoProps {
  className?: string
  showSubtitle?: boolean
  variant?: "header" | "full"
  useImage?: boolean
}

export function Logo({ 
  className, 
  showSubtitle = false, 
  variant = "header",
  useImage = true 
}: LogoProps) {
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const activeTheme = theme === "system" ? systemTheme : theme
    setCurrentTheme(activeTheme === "dark" ? "dark" : "light")
  }, [theme, systemTheme, mounted])

  // Image-based logo with text (combined)
  if (useImage) {
    // Black logo for dark mode, white logo for light mode
    const logoSrc = currentTheme === "dark" ? "/LOGO BLACK.jpg" : "/LOGO WHITE.jpg"
    const logoWidth = variant === "header" ? 200 : 250
    const logoHeight = variant === "header" ? 56 : 70

    return (
      <Link href="/" className={cn("flex items-center gap-3", className)}>
        {mounted ? (
          <>
            <Image
              src={logoSrc}
              alt="LUXE LINEAGE KLASIC WEAR"
              width={logoWidth}
              height={logoHeight}
              className={cn(
                "h-auto object-contain transition-opacity duration-200",
                variant === "header" ? "h-12 w-auto max-w-[200px]" : "h-14 w-auto max-w-[250px]"
              )}
              priority
            />
            {variant === "header" && (
              <span className="font-serif text-2xl font-light tracking-wider hidden sm:inline-block">
                LUXELINEAGE
              </span>
            )}
          </>
        ) : (
          // Placeholder while theme loads
          <div className={cn(
            "bg-muted animate-pulse rounded",
            variant === "header" ? "h-12 w-32" : "h-14 w-40"
          )} />
        )}
      </Link>
    )
  }

  // Text-based logo (fallback)
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

