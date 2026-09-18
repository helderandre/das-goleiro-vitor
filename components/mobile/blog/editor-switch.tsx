"use client"

import * as React from "react"

/**
 * Monta só um dos editores (TipTap é pesado e dois editores do mesmo post
 * disputariam uploads). Decide pela largura da tela depois de montar.
 */
export function EditorSwitch({ mobile, desktop }: { mobile: React.ReactNode; desktop: React.ReactNode }) {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])
  if (isMobile === null) return null
  return <>{isMobile ? mobile : desktop}</>
}
