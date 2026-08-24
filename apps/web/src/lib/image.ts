export interface ProcessedImage { file: File; preview: string; width: number; height: number; }

/** Smaller wide-art variant for phones; non-IGDB URLs pass through untouched. */
export const igdbWideMobileVariant = (url: string): string =>
  url.includes('images.igdb.com') && url.includes('/t_1080p/')
    ? url.replace('/t_1080p/', '/t_720p/')
    : url;

export async function preprocessImage(file: File, max = 1600, quality = .84): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Image must be smaller than 12 MB.');
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
    const canvas = ctx.canvas; canvas.width = width; canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not process image.')), 'image/webp', quality));
    const optimized = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
    return { file: optimized, preview: URL.createObjectURL(blob), width, height };
  } finally {
    bitmap.close();
  }
}
