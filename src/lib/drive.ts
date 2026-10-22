/**
 * Utility functions for validating and handling Google Drive URLs in WinterBuilds.
 */

/**
 * Validates whether a given URL is a valid Google Drive file or folder URL.
 * Supports:
 * - https://drive.google.com/file/d/{FILE_ID}/...
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?id={FILE_ID}...
 * - https://docs.google.com/file/d/{FILE_ID}/...
 * - https://drive.google.com/drive/folders/{FOLDER_ID}...
 * - https://drive.google.com/drive/u/{USER}/folders/{FOLDER_ID}...
 */
export function isValidGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'drive.google.com' && host !== 'docs.google.com') {
      return false;
    }

    const pathname = parsed.pathname;
    const hasFileD = /\/file\/d\/[a-zA-Z0-9_-]+/i.test(pathname);
    const hasIdParam = Boolean(parsed.searchParams.get('id'));
    const hasFolder = /\/drive\/(?:u\/\d+\/)?folders\/[a-zA-Z0-9_-]+/i.test(pathname);
    const hasUc = /\/uc/i.test(pathname) && Boolean(parsed.searchParams.get('id'));

    return hasFileD || hasIdParam || hasFolder || hasUc || (pathname.length > 5 && /[a-zA-Z0-9_-]{15,}/.test(trimmed));
  } catch {
    return false;
  }
}

/**
 * Cleans and formats a Google Drive URL, preserving the exact link.
 */
export function cleanGoogleDriveUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  return url.trim();
}
