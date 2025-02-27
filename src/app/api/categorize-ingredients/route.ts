import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { ingredients } = await req.json();
    
    // Simple categorization without using AI
    const categories = {
      'Produce': [],
      'Meat & Seafood': [],
      'Dairy & Eggs': [],
      'Pantry': [],
      'Other': []
    };
    
    // Filter out section headers
    const actualIngredients = ingredients.filter((item: string) => !item.endsWith(':'));
    
    actualIngredients.forEach((item: string) => {
      const lowerItem = item.toLowerCase();
      
      // Produce detection
      if (lowerItem.includes('tomato') || lowerItem.includes('onion') || 
          lowerItem.includes('garlic') || lowerItem.includes('lettuce') ||
          lowerItem.includes('pepper') || lowerItem.includes('vegetable') ||
          lowerItem.includes('parsley') || lowerItem.includes('herb') ||
          lowerItem.includes('carrot') || lowerItem.includes('celery') ||
          lowerItem.includes('potato') || lowerItem.includes('spinach') ||
          lowerItem.includes('basil') || lowerItem.includes('cilantro') ||
          lowerItem.includes('fruit') || lowerItem.includes('lemon') ||
          lowerItem.includes('lime') || lowerItem.includes('zucchini')) {
        categories['Produce'].push(item);
      } 
      // Meat & Seafood detection
      else if (lowerItem.includes('chicken') || lowerItem.includes('beef') || 
              lowerItem.includes('pork') || lowerItem.includes('fish') ||
              lowerItem.includes('shrimp') || lowerItem.includes('sausage') ||
              lowerItem.includes('bacon') || lowerItem.includes('ham') ||
              lowerItem.includes('turkey') || lowerItem.includes('meat') ||
              lowerItem.includes('steak') || lowerItem.includes('ground') ||
              lowerItem.includes('lamb') || lowerItem.includes('seafood') ||
              lowerItem.includes('crab') || lowerItem.includes('lobster') ||
              lowerItem.includes('italian sausage') || lowerItem.includes('chorizo')) {
        categories['Meat & Seafood'].push(item);
      } 
      // Dairy & Eggs detection
      else if (lowerItem.includes('milk') || lowerItem.includes('cheese') || 
              lowerItem.includes('yogurt') || lowerItem.includes('egg') ||
              lowerItem.includes('butter') || lowerItem.includes('ricotta') ||
              lowerItem.includes('mozzarella') || lowerItem.includes('parmesan') ||
              lowerItem.includes('cream') || lowerItem.includes('dairy') ||
              lowerItem.includes('cheddar') || lowerItem.includes('swiss') ||
              lowerItem.includes('feta') || lowerItem.includes('goat cheese')) {
        categories['Dairy & Eggs'].push(item);
      } 
      // Pantry detection
      else if (lowerItem.includes('flour') || lowerItem.includes('sugar') || 
              lowerItem.includes('oil') || lowerItem.includes('pasta') ||
              lowerItem.includes('rice') || lowerItem.includes('can') ||
              lowerItem.includes('salt') || lowerItem.includes('pepper') ||
              lowerItem.includes('noodle') || lowerItem.includes('sauce') ||
              lowerItem.includes('spice') || lowerItem.includes('herb') ||
              lowerItem.includes('vinegar') || lowerItem.includes('broth') ||
              lowerItem.includes('stock') || lowerItem.includes('seasoning') ||
              lowerItem.includes('bread') || lowerItem.includes('crumb') ||
              lowerItem.includes('honey') || lowerItem.includes('syrup') ||
              lowerItem.includes('soy sauce') || lowerItem.includes('olive oil')) {
        categories['Pantry'].push(item);
      } 
      // Default to Other
      else {
        categories['Other'].push(item);
      }
    });
    
    // Remove empty categories
    const filteredCategories = Object.fromEntries(
      Object.entries(categories).filter(([_, items]) => items.length > 0)
    );
    
    return NextResponse.json({ categories: filteredCategories });
  } catch (error) {
    console.error('Error categorizing ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to categorize ingredients' },
      { status: 500 }
    );
  }
} 