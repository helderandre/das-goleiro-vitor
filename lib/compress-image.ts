import imageCompression from "browser-image-compression"

const MAX_WIDTH = 1920
const MAX_SIZE_MB = 0.15 // 150KB

/**
 * Compresses an image to max 1920px width, max 150KB, and converts to WebP.
 */
export async function compressImage(file: File): Promise<File> {
  // Already a small WebP — skip
  if (file.type === "image/webp" && file.size <= MAX_SIZE_MB * 1024 * 1024) {
    return file
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH,
    useWebWorker: true,
    fileType: "image/webp",
  })

  // Rename extension to .webp
  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([compressed], `${baseName}.webp`, { type: "image/webp" })
}
