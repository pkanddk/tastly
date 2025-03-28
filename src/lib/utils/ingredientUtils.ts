/**
 * Utility functions for standardizing ingredient names
 */

/**
 * Common unnecessary qualifiers that can be removed
 */
const UNNECESSARY_QUALIFIERS = [
  'fresh',
  'ripe',
  'raw',
  'whole',
  'regular',
  'plain',
  'basic',
  'standard',
  'normal',
  'common',
  'ordinary',
  'simple',
  'pure',
  'natural',
  'basic',
  'traditional',
  'conventional',
  'typical',
  'usual',
  'everyday',
  'standard-issue',
];

/**
 * Qualifiers that should always be kept
 */
const ESSENTIAL_QUALIFIERS = [
  'organic',
  'frozen',
  'canned',
  'dried',
  'smoked',
  'roasted',
  'ground',
  'sliced',
  'diced',
  'minced',
  'chopped',
  'grated',
  'shredded',
  'crushed',
  'powdered',
  'whole grain',
  'low-fat',
  'fat-free',
  'sugar-free',
  'unsweetened',
  'sweetened',
  'salted',
  'unsalted',
  'raw',
  'cooked',
  'instant',
  'quick-cooking',
  'extra virgin',
  'virgin',
  'greek',
  'italian',
  'mexican',
  'thai',
  'japanese',
  'chinese',
  'french',
  'spanish',
];

/**
 * Standardizes an ingredient name by:
 * 1. Capitalizing the first letter of each word
 * 2. Removing unnecessary qualifiers unless they're essential
 * 3. Standardizing common ingredient names
 */
export const standardizeIngredientName = (name: string): string => {
  // Convert to lowercase for consistent processing
  let standardized = name.toLowerCase();

  // Remove unnecessary qualifiers unless they're essential
  UNNECESSARY_QUALIFIERS.forEach(qualifier => {
    // Only remove if it's not part of an essential qualifier
    if (!ESSENTIAL_QUALIFIERS.some(essential => essential.includes(qualifier))) {
      const regex = new RegExp(`\\b${qualifier}\\s+`, 'gi');
      standardized = standardized.replace(regex, '');
    }
  });

  // Capitalize first letter of each word
  standardized = standardized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return standardized.trim();
};

/**
 * Standardizes an array of ingredient names
 */
export const standardizeIngredients = (ingredients: string[]): string[] => {
  return ingredients.map(standardizeIngredientName);
}; 