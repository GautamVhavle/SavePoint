export interface ProcessedImage { file: File; preview: string; width: number; height: number; }
export async function preprocessImage(file: File, max = 1600, quality = .84): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Image must be smaller than 12 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale), height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not process image.')), 'image/webp', quality));
  const optimized = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
  return { file: optimized, preview: URL.createObjectURL(blob), width, height };
}
