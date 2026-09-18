/** Redes sociais que o site público sabe mostrar, com o prefixo de cada uma. */
export const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram", prefix: "https://instagram.com/", placeholder: "goleirovitor" },
  { value: "youtube", label: "YouTube", prefix: "https://youtube.com/@", placeholder: "goleirovitor" },
  { value: "facebook", label: "Facebook", prefix: "https://facebook.com/", placeholder: "goleirovitor" },
  { value: "tiktok", label: "TikTok", prefix: "https://tiktok.com/@", placeholder: "goleirovitor" },
  { value: "twitter", label: "X (Twitter)", prefix: "https://x.com/", placeholder: "goleirovitor" },
  { value: "linkedin", label: "LinkedIn", prefix: "https://linkedin.com/in/", placeholder: "goleirovitor" },
  { value: "whatsapp", label: "WhatsApp", prefix: "https://wa.me/", placeholder: "5511999999999" },
  { value: "telegram", label: "Telegram", prefix: "https://t.me/", placeholder: "goleirovitor" },
  { value: "spotify", label: "Spotify", prefix: "https://open.spotify.com/artist/", placeholder: "id-do-artista" },
  { value: "threads", label: "Threads", prefix: "https://threads.net/@", placeholder: "goleirovitor" },
  { value: "pinterest", label: "Pinterest", prefix: "https://pinterest.com/", placeholder: "goleirovitor" },
  { value: "website", label: "Site / Link", prefix: "", placeholder: "https://meusite.com" },
] as const

export function getPlatformConfig(platform: string) {
  return PLATFORM_OPTIONS.find((o) => o.value === platform) ?? PLATFORM_OPTIONS[PLATFORM_OPTIONS.length - 1]
}

/** Remove the base URL prefix to get just the handle/value part */
export function extractHandle(platform: string, fullUrl: string): string {
  const config = getPlatformConfig(platform)
  if (!config.prefix || !fullUrl) return fullUrl
  if (fullUrl.startsWith(config.prefix)) return fullUrl.slice(config.prefix.length)
  // Try without protocol variations
  const withoutProtocol = fullUrl.replace(/^https?:\/\//, "")
  const prefixWithoutProtocol = config.prefix.replace(/^https?:\/\//, "")
  if (withoutProtocol.startsWith(prefixWithoutProtocol)) return withoutProtocol.slice(prefixWithoutProtocol.length)
  return fullUrl
}

/** Build full URL from handle and platform */
export function buildFullUrl(platform: string, handle: string): string {
  if (!handle) return ""
  const config = getPlatformConfig(platform)
  if (!config.prefix) return handle // website: user types full URL
  // If user pasted a full URL, keep it as-is
  if (handle.startsWith("http://") || handle.startsWith("https://")) return handle
  return `${config.prefix}${handle}`
}

export interface SocialLink {
  platform: string
  url: string
  label: string
}

/** ID do vídeo em links do YouTube (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string | null | undefined) {
  const m = (url ?? "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/)
  return m ? m[1] : null
}

/** Capa gerada pelo próprio YouTube para o vídeo. */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
