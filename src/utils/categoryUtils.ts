import { ProductCategory } from '../types';

/**
 * Normalizes any category string (Arabic or English) to a standard ProductCategory enum value.
 */
export const normalizeCategory = (cat?: any): ProductCategory => {
  if (!cat) return ProductCategory.VEGETABLES;
  const c = String(cat).trim().toLowerCase();

  if (
    c === 'vegetables' ||
    c.includes('خضار') ||
    c.includes('خضروات') ||
    c.includes('خضره') ||
    c.includes('خضرة')
  ) {
    return ProductCategory.VEGETABLES;
  }
  if (
    c === 'fruits' ||
    c.includes('فواكه') ||
    c.includes('فاكهة') ||
    c.includes('فاكهه') ||
    c.includes('فاكه')
  ) {
    return ProductCategory.FRUITS;
  }
  if (
    c === 'herbs' ||
    c === 'leafy' ||
    c.includes('ورق') ||
    c.includes('عشب') ||
    c.includes('أعشاب') ||
    c.includes('اعشاب')
  ) {
    return ProductCategory.LEAFY;
  }
  if (
    c === 'boxes' ||
    c.includes('بكس') ||
    c.includes('شوال') ||
    c.includes('كرتون') ||
    c.includes('box')
  ) {
    return ProductCategory.BOXES;
  }
  return ProductCategory.VEGETABLES;
};

/**
 * Checks if a product's category matches a target category filter.
 */
export const isCategoryMatch = (
  productCategory?: any,
  targetCategory?: any
): boolean => {
  if (!targetCategory || targetCategory === 'all') return true;
  return normalizeCategory(productCategory) === normalizeCategory(targetCategory);
};
