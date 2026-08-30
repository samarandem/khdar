/**
 * Utility functions for handling, sanitizing, and inlining images (logos, product photos)
 * to ensure 100% compatibility with html2canvas, printing, and PDF generation.
 */

export const DEFAULT_SHOP_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><circle cx="80" cy="80" r="76" fill="%23F0FDF4" stroke="%2316A34A" stroke-width="3"/><path d="M30 85 C30 85 40 130 80 130 C120 130 130 85 130 85 Z" fill="%23087A35"/><path d="M25 80 L135 80 C138 80 140 83 138 86 L130 92 L30 92 L22 86 C20 83 22 80 25 80 Z" fill="%23065F2C"/><path d="M50 88 L60 128" stroke="%2316A34A" stroke-width="2.5" stroke-linecap="round"/><path d="M80 88 L80 130" stroke="%2316A34A" stroke-width="2.5" stroke-linecap="round"/><path d="M110 88 L100 128" stroke="%2316A34A" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="65" r="22" fill="%23DC2626"/><path d="M58 43 C58 38 62 38 62 43 Z" fill="%2315803D" stroke="%2315803D" stroke-width="2"/><path d="M54 44 C50 40 66 40 62 44" fill="none" stroke="%2315803D" stroke-width="2" stroke-linecap="round"/><circle cx="53" cy="58" r="4" fill="%23EF4444" opacity="0.6"/><circle cx="100" cy="68" r="20" fill="%23EA580C"/><circle cx="106" cy="62" r="3.5" fill="%23FB923C" opacity="0.6"/><path d="M98 48 C96 44 102 44 100 48 Z" fill="%2315803D"/><circle cx="80" cy="55" r="17" fill="%23EAB308"/><path d="M78 38 L82 38" stroke="%23CA8A04" stroke-width="3" stroke-linecap="round"/><path d="M38 68 C30 52 50 42 58 58 C50 68 38 68 38 68 Z" fill="%2322C55E"/><path d="M122 68 C130 52 110 42 102 58 C110 68 122 68 122 68 Z" fill="%2316A34A"/></svg>`;

/**
 * Format and sanitize an image URL (supports Google Drive, Dropbox, direct URLs, Base64)
 */
export const formatImageUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return DEFAULT_SHOP_LOGO;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SHOP_LOGO;

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Google Drive links (convert share links to direct image CDN links)
  if (trimmed.includes('drive.google.com')) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
    }
  }

  // Dropbox links
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('dl=0', 'raw=1');
  }

  return trimmed;
};

/**
 * Converts any image URL to a Base64 data URL
 */
export const convertImageUrlToBase64 = async (url: string): Promise<string> => {
  const formatted = formatImageUrl(url);
  if (!formatted) return '';
  if (formatted.startsWith('data:')) return formatted;

  // Attempt 1: Direct fetch with CORS
  try {
    const res = await fetch(formatted, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(formatted);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Direct fetch failed
  }

  // Attempt 2: Proxy fetch (weserv)
  try {
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(formatted)}&output=png`;
    const res = await fetch(proxyUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(formatted);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Proxy fetch failed
  }

  // Attempt 2: Canvas drawing
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 200;
        canvas.height = img.naturalHeight || img.height || 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Tainted canvas
      }
      resolve(formatted);
    };
    img.onerror = () => resolve(formatted);
    img.src = formatted;
  });
};

/**
 * Pre-processes all <img> elements inside a DOM container,
 * converting them to inlined Base64 Data URLs so html2canvas renders them flawlessly.
 * Returns a map of the original src values for clean rollback.
 */
export const preloadAndInlineImages = async (container: HTMLElement): Promise<Map<HTMLImageElement, string>> => {
  const originalSources = new Map<HTMLImageElement, string>();
  const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

  const conversionPromises = images.map(async (img) => {
    const currentSrc = img.currentSrc || img.src;
    if (!currentSrc) return;

    originalSources.set(img, currentSrc);

    if (currentSrc.startsWith('data:')) {
      return;
    }

    try {
      const base64 = await convertImageUrlToBase64(currentSrc);
      if (base64 && base64.startsWith('data:')) {
        img.src = base64;
      }
    } catch (e) {
      console.warn('Failed to inline image for PDF capture:', e);
    }
  });

  await Promise.all(conversionPromises);

  // Ensure all images are fully decoded in the DOM
  const decodePromises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    if (img.decode) {
      return img.decode().catch(() => Promise.resolve());
    }
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 800); // safety timeout
    });
  });

  await Promise.all(decodePromises);

  return originalSources;
};
