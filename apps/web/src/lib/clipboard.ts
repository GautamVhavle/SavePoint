/** Clipboard writes fail silently in some browsers/permissions states; callers get a boolean instead of an exception path to repeat everywhere. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
