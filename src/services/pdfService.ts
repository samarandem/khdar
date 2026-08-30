import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Invoice, Product, ShopSettings } from '../types';
import { preloadAndInlineImages } from '../utils/imageUtils';

/**
 * Trigger native browser system print for 100% vector-sharp, crystal-clear Arabic printing
 * directly opening the operating system's printer selection dialog (طابعات النظام)
 */
export const printHtmlElement = async (elementId?: string): Promise<void> => {
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      try {
        await preloadAndInlineImages(element);
      } catch (e) {
        console.warn('Image preload error before print:', e);
      }
    }
  }
  window.print();
};

export const printNativePDF = (): void => {
  window.print();
};

/**
 * Convert OKLCH to RGB/RGBA color string
 */
export function oklchToRgb(l: number, c: number, h: number, a?: number): string {
  // 1. Convert OKLCH to OKLAB
  const hRad = (h * Math.PI) / 180;
  const oklabL = l;
  const oklaba = c * Math.cos(hRad);
  const oklabb = c * Math.sin(hRad);

  // 2. Convert OKLAB to LMS
  const lmsL = oklabL + 0.3963377774 * oklaba + 0.2158037573 * oklabb;
  const lmsM = oklabL - 0.1055613458 * oklaba - 0.0638541728 * oklabb;
  const lmsS = oklabL - 0.0894841775 * oklaba - 1.2914855480 * oklabb;

  // 3. LMS to the power of 3
  const lmsL3 = Math.pow(Math.max(0, lmsL), 3);
  const lmsM3 = Math.pow(Math.max(0, lmsM), 3);
  const lmsS3 = Math.pow(Math.max(0, lmsS), 3);

  // 4. Convert LMS3 to linear sRGB
  const rL = +4.0767416621 * lmsL3 - 3.3077115913 * lmsM3 + 0.2309699292 * lmsS3;
  const gL = -1.2684380046 * lmsL3 + 2.6097574011 * lmsM3 - 0.3413193965 * lmsS3;
  const bL = -0.0041960863 * lmsL3 - 0.7034186145 * lmsM3 + 1.7076147010 * lmsS3;

  // 5. Linear sRGB to standard sRGB (with gamma correction)
  const transfer = (val: number) => {
    return val <= 0.0031308
      ? 12.92 * val
      : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(transfer(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(transfer(gL) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(transfer(bL) * 255)));

  if (a !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Safely parse and replace CSS blocks with nested, balanced parentheses
 */
export function replaceBalancedBlocks(
  text: string,
  keyword: string,
  replacement: string | ((match: string) => string)
): string {
  let index = 0;
  let currentText = text;
  
  while (true) {
    const startIdx = currentText.indexOf(keyword + '(', index);
    if (startIdx === -1) break;
    
    let parenCount = 1;
    let endIdx = -1;
    
    for (let i = startIdx + keyword.length + 1; i < currentText.length; i++) {
      if (currentText[i] === '(') parenCount++;
      else if (currentText[i] === ')') parenCount--;
      
      if (parenCount === 0) {
        endIdx = i;
        break;
      }
    }
    
    if (endIdx !== -1) {
      const fullMatch = currentText.substring(startIdx, endIdx + 1);
      const replacedValue = typeof replacement === 'function' ? replacement(fullMatch) : replacement;
      currentText = currentText.substring(0, startIdx) + replacedValue + currentText.substring(endIdx + 1);
      index = startIdx + replacedValue.length;
    } else {
      break;
    }
  }
  return currentText;
}

/**
 * Capture an HTML element and download as a high-definition A4 PDF
 * Guaranteed to preserve connected Arabic text and high-res layout
 */
export const generatePdfFromElement = async (
  elementId: string,
  fileName: string = 'فاتورة'
): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  // Ensure fonts are loaded
  if (document.fonts) {
    await document.fonts.ready;
  }

  const helperCanvas = document.createElement('canvas');
  const helperCtx = helperCanvas.getContext('2d');

  const isUnsupportedColor = (str: string): boolean => {
    if (!str) return false;
    return /oklch|oklab|color-mix|color\(|lab\(|lch\(|hwb\(|light-dark\(/i.test(str);
  };

  const convertColorToRgb = (colorStr: string): string => {
    if (!colorStr || !isUnsupportedColor(colorStr)) {
      return colorStr;
    }

    const lightDarkRegex = /light-dark\(\s*([^,()]+(?:\([^)]*\))?)\s*,\s*([^)]+(?:\([^)]*\))?)\)/i;
    const lightDarkMatch = colorStr.match(lightDarkRegex);
    if (lightDarkMatch) {
      return convertColorToRgb(lightDarkMatch[1].trim());
    }

    const oklchRegex = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)/i;
    const oklchMatch = colorStr.match(oklchRegex);
    if (oklchMatch) {
      try {
        let lVal = parseFloat(oklchMatch[1]);
        if (oklchMatch[2] === '%') lVal = lVal / 100;
        const cVal = parseFloat(oklchMatch[3]);
        const hVal = parseFloat(oklchMatch[4]);
        
        let aVal: number | undefined = undefined;
        if (oklchMatch[5]) {
          aVal = parseFloat(oklchMatch[5]);
          if (oklchMatch[6] === '%') aVal = aVal / 100;
        }
        return oklchToRgb(lVal, cVal, hVal, aVal);
      } catch {
        // ignore fallback
      }
    }

    if (helperCtx) {
      try {
        helperCtx.fillStyle = '#000000';
        helperCtx.fillStyle = colorStr;
        const computed = helperCtx.fillStyle;
        if (computed && !isUnsupportedColor(computed) && computed !== '#000000') {
          return computed;
        }
      } catch {
        // ignore fallback
      }
    }

    return 'rgb(31, 41, 55)';
  };

  const mutatedElements = new Map<HTMLElement, string | null>();

  const traverseAndApplyRgb = (node: HTMLElement) => {
    const originalStyle = node.getAttribute('style');
    mutatedElements.set(node, originalStyle);

    const computed = window.getComputedStyle(node);
    const bg = computed.backgroundColor;
    const fg = computed.color;
    const borderTop = computed.borderTopColor;
    const borderBottom = computed.borderBottomColor;
    const borderLeft = computed.borderLeftColor;
    const borderRight = computed.borderRightColor;

    if (bg && isUnsupportedColor(bg)) {
      node.style.backgroundColor = convertColorToRgb(bg);
    }
    if (fg && isUnsupportedColor(fg)) {
      node.style.color = convertColorToRgb(fg);
    }
    if (borderTop && isUnsupportedColor(borderTop)) {
      node.style.borderTopColor = convertColorToRgb(borderTop);
    }
    if (borderBottom && isUnsupportedColor(borderBottom)) {
      node.style.borderBottomColor = convertColorToRgb(borderBottom);
    }
    if (borderLeft && isUnsupportedColor(borderLeft)) {
      node.style.borderLeftColor = convertColorToRgb(borderLeft);
    }
    if (borderRight && isUnsupportedColor(borderRight)) {
      node.style.borderRightColor = convertColorToRgb(borderRight);
    }

    node.style.letterSpacing = 'normal';

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child instanceof HTMLElement) {
        traverseAndApplyRgb(child);
      }
    }
  };

  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  let originalImageSources: Map<HTMLImageElement, string> | null = null;

  try {
    // 1. Preload and inline all images (logo, product photos) to Base64 to bypass CORS & ensure 100% render in PDF
    originalImageSources = await preloadAndInlineImages(element);

    // 2. Normalize and sanitize colors for OKLCH / modern CSS
    traverseAndApplyRgb(element);

    window.scrollTo(0, 0);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pages = Array.from(element.querySelectorAll('.pdf-page')) as HTMLElement[];

    if (pages.length > 0) {
      // MULTI-PAGE CHUNKED RENDER
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        if (i > 0) {
          pdf.addPage();
        }

        const targetWidth = pageEl.scrollWidth || pageEl.offsetWidth || 800;
        const targetHeight = pageEl.scrollHeight || pageEl.offsetHeight || 1120;

        const canvas = await html2canvas(pageEl, {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: targetWidth,
          height: targetHeight,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 4;
        const printableWidth = pdfWidth - margin * 2;
        const printableHeight = pdfHeight - margin * 2;

        let imgWidth = printableWidth;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > printableHeight) {
          const scaleRatio = printableHeight / imgHeight;
          imgHeight = printableHeight;
          imgWidth = imgWidth * scaleRatio;
        }

        const xOffset = margin + (printableWidth - imgWidth) / 2;
        pdf.addImage(
          imgData,
          'JPEG',
          xOffset,
          margin,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      }
    } else {
      // SINGLE-PAGE OR DEFAULT SCROLL SLICING FALLBACK
      const targetWidth = element.scrollWidth || element.offsetWidth || 800;
      const targetHeight = element.scrollHeight || element.offsetHeight || 1000;

      const canvas = await html2canvas(element, {
        scale: 3.0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: targetWidth,
        height: targetHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const printableWidth = pdfWidth - margin * 2;
      const printableHeight = pdfHeight - margin * 2;

      let imgWidth = printableWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= printableHeight * 1.30) {
        if (imgHeight > printableHeight) {
          const scaleRatio = printableHeight / imgHeight;
          imgHeight = printableHeight;
          imgWidth = printableWidth * scaleRatio;
        }
        const xOffset = margin + (printableWidth - imgWidth) / 2;
        pdf.addImage(
          imgData,
          'JPEG',
          xOffset,
          margin,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      } else {
        let heightLeft = imgHeight;
        let pageIndex = 0;

        while (heightLeft > 0) {
          if (pageIndex > 0) {
            pdf.addPage();
          }
          const position = margin - pageIndex * printableHeight;
          pdf.addImage(
            imgData,
            'JPEG',
            margin,
            position,
            printableWidth,
            imgHeight,
            undefined,
            'FAST'
          );
          heightLeft -= printableHeight;
          pageIndex++;
        }
      }
    }

    pdf.save(`${fileName}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    window.print();
    return false;
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);

    if (originalImageSources) {
      originalImageSources.forEach((originalSrc, imgEl) => {
        if (imgEl && originalSrc) {
          imgEl.src = originalSrc;
        }
      });
    }

    mutatedElements.forEach((originalStyle, node) => {
      if (originalStyle !== null) {
        node.setAttribute('style', originalStyle);
      } else {
        node.removeAttribute('style');
      }
    });
  }
};

/**
 * Format invoice data for WhatsApp text sharing
 */
export const formatInvoiceForWhatsApp = (
  invoice: Invoice,
  settings: ShopSettings
): string => {
  const itemsList = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}*: ${(Number(item.quantity) || 0).toFixed(3)} ${item.unit || ''} × ${(Number(item.unitPrice) || 0).toFixed(3)} = *${(Number(item.total) || 0).toFixed(2)} ${settings.currency}*`
    )
    .join('\n');

  const deliveryVal = Number(invoice.deliveryFee) || 0;
  const discountVal = Number(invoice.discount) || 0;
  const subtotalVal = Number(invoice.subtotal ?? invoice.total) || 0;
  const totalVal = Number(invoice.total) || 0;

  const deliveryLine = deliveryVal > 0 ? `\n🚚 خدمة التوصيل: ${deliveryVal.toFixed(2)} ${settings.currency}` : '';
  const discountLine = discountVal > 0 ? `\n🏷️ الخصم: ${discountVal.toFixed(2)} ${settings.currency}` : '';

  const text = `
🛒 *${settings.shopName}*
🧾 *فاتورة مبيعات رقم ${invoice.id}*
📅 التاريخ: ${invoice.date}
👤 المشتري: ${invoice.customerName}
📌 حالة السداد: *${invoice.status === 'pending' ? 'ذمم (آجل)' : 'نقداً (مدفوعة)'}*

📋 *تفاصيل الفاتورة:*
${itemsList}

------------------------
💵 المجموع: ${subtotalVal.toFixed(2)} ${settings.currency}${deliveryLine}${discountLine}
💰 *الإجمالي النهائي: ${totalVal.toFixed(2)} ${settings.currency}*

شكراً لتعاملكم معنا! 🍃
  `.trim();

  return encodeURIComponent(text);
};

/**
 * Format daily price list for WhatsApp broadcast
 */
export const formatTodayPricesForWhatsApp = (
  products: Product[],
  settings: ShopSettings
): string => {
  const today = new Date().toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const availableProducts = products.filter((p) => p.active !== false);
  const itemsList = availableProducts
    .map(
      (p) =>
        `• *${p.name}*: ${p.price.toFixed(3)} ${settings.currency} / ${p.unit}`
    )
    .join('\n');

  const titleHeader = settings.todayPricesTitle || 'قائمة أسعار اليوم';

  const text = `
🛒 *${settings.shopName}*
📢 *${titleHeader} (${today})*

${itemsList}

📞 للطلب والاستفسار: ${settings.phone}
🚚 خدمة التوصيل متوفرة
🍃 ${settings.slogan}
  `.trim();

  return encodeURIComponent(text);
};

export const formatPriceListForWhatsApp = formatTodayPricesForWhatsApp;
