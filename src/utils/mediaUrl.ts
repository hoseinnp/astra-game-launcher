/**
 * Utility to normalize local file paths and URLs for reliable loading in Chromium / Electron.
 * On Windows, Chromium requires 'file:///' (three slashes) for drive letter paths.
 */
export function normalizeMediaUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already standard HTTP/HTTPS/data/blob
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  // Already properly formatted file:/// URL
  if (trimmed.startsWith('file:///')) {
    return trimmed;
  }

  // Handle Windows UNC or file:// with only 2 slashes (e.g. file://C:/... -> file:///C:/...)
  if (trimmed.startsWith('file://')) {
    const afterScheme = trimmed.replace(/^file:\/\//, '');
    if (/^[a-zA-Z]:/i.test(afterScheme)) {
      return `file:///${afterScheme}`;
    }
    return `file:///${afterScheme.replace(/^\/+/, '')}`;
  }

  // Handle raw Windows absolute drive paths e.g. "C:\Games\..." or "C:/Games/..."
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) {
    return `file:///${trimmed.replace(/\\/g, '/')}`;
  }

  return trimmed;
}
