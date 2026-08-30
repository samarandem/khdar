/**
 * Helper to safely parse numbers containing standard English digits,
 * Arabic-Indic digits (٠-٩), Persian digits (۰-۹), and comma decimal separators.
 */
export const parseArabicFloat = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val)
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/٫/g, '.')
    .replace(/,/g, '.')
    .trim();

  let parsed = parseFloat(str);
  if (!isNaN(parsed)) return parsed;

  const match = str.match(/-?\d+(?:\.\d+)?/);
  if (match) {
    parsed = parseFloat(match[0]);
    if (!isNaN(parsed)) return parsed;
  }

  return 0;
};

/**
 * Arabic Currency Tafqeet Helper (Tafqeet for Jordanian Dinar and standard currencies)
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
const TEENS = [
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];
const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = [
  '',
  'مئة',
  'مئتان',
  'ثلاثمئة',
  'أربعمئة',
  'خمسمئة',
  'ستمئة',
  'سبعمئة',
  'ثمانمئة',
  'تسعمئة',
];

const convertGroup = (n: number): string => {
  if (n === 0) return '';
  let result = '';

  const h = Math.floor(n / 100);
  const rem = n % 100;

  if (h > 0) {
    result += HUNDREDS[h];
  }

  if (rem > 0) {
    if (result) result += ' و ';

    if (rem <= 10) {
      result += ONES[rem];
    } else if (rem < 20) {
      result += TEENS[rem - 10];
    } else {
      const o = rem % 10;
      const t = Math.floor(rem / 10);
      if (o > 0) {
        result += ONES[o] + ' و ' + TENS[t];
      } else {
        result += TENS[t];
      }
    }
  }

  return result;
};

const convertIntegerToWords = (num: number): string => {
  if (num === 0) return 'صفر';
  if (num < 0) return 'سالب ' + convertIntegerToWords(Math.abs(num));

  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;

  let parts: string[] = [];

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('ألف');
    } else if (thousands === 2) {
      parts.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      parts.push(convertGroup(thousands) + ' آلاف');
    } else {
      parts.push(convertGroup(thousands) + ' ألفاً');
    }
  }

  if (remainder > 0) {
    parts.push(convertGroup(remainder));
  }

  return parts.join(' و ');
};

/**
 * Converts a price number (e.g. 6.00 or 12.500) into Arabic Tafqeet text
 * Example:
 * 6 -> "ستة دنانير فقط لا غير"
 * 6.5 -> "ستة دنانير وخمسمائة فلس فقط لا غير"
 */
export const numberToArabicWords = (amount: number, currency = 'د.أ'): string => {
  if (isNaN(amount) || amount === 0) {
    return 'صفر دنانير فقط لا غير';
  }

  const rounded = Math.round(amount * 1000) / 1000;
  const dinars = Math.floor(rounded);
  const fraction = Math.round((rounded - dinars) * 1000);

  let dinarText = '';
  if (dinars === 1) {
    dinarText = 'دينار واحد';
  } else if (dinars === 2) {
    dinarText = 'ديناران';
  } else if (dinars >= 3 && dinars <= 10) {
    dinarText = convertIntegerToWords(dinars) + ' دنانير';
  } else if (dinars > 10) {
    dinarText = convertIntegerToWords(dinars) + ' ديناراً';
  }

  let fractionText = '';
  if (fraction > 0) {
    if (fraction === 500) {
      fractionText = 'نصف دينار';
    } else if (fraction === 250) {
      fractionText = 'ربع دينار';
    } else if (fraction === 750) {
      fractionText = 'ثلاثة أرباع الدينار';
    } else if (fraction === 100) {
      fractionText = 'مئة فلس';
    } else if (fraction === 200) {
      fractionText = 'مئتا فلس';
    } else {
      fractionText = convertIntegerToWords(fraction) + ' فلس';
    }
  }

  let full = '';
  if (dinarText && fractionText) {
    full = `${dinarText} و ${fractionText}`;
  } else if (dinarText) {
    full = dinarText;
  } else if (fractionText) {
    full = fractionText;
  } else {
    full = 'صفر دنانير';
  }

  return `${full} فقط لا غير`;
};
