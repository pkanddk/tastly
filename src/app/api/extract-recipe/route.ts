import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// This is the correct way to set the runtime in Next.js App Router
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  let requestUrl = ''; // Declare at top level to fix linter error
  
  try {
    const { url } = await req.json();
    requestUrl = url; // Store for error handling
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    // Set up a timeout for the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds for desktop
    
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
      
      // Make the API call with the timeout
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a recipe extraction expert. Extract recipes and format them in a consistent markdown structure.
Always include these sections in this exact order:

1. Title with a single # (main heading)
2. Ingredients section with bullet points - IMPORTANT:
   - Format ALL ingredient categories using ### prefix, like "### Cheese Filling:" or "### Meat Sauce:" (omit phrases like "For the" when possible)
   - Format ingredient names consistently:
     - Capitalize the first letter of each word
     - Remove unnecessary qualifiers like "fresh", "whole", "raw" unless they're essential (e.g., keep "Fresh Mozzarella" as it's different from regular mozzarella)
     - Use simple, clear ingredient names (e.g., "Mozzarella Cheese" instead of "Fresh Whole Milk Mozzarella Cheese")
     - Keep essential qualifiers that affect the recipe (e.g., "Whole Milk" vs "Skim Milk")
3. Instructions section with numbered steps
4. Cooking Time and Servings section
5. Notes section for tips and variations

Additionally, if present in the original recipe, include these optional sections in this order:
- Nutritional Information
- Storage Instructions (including how to store leftovers)
- Reheating Instructions (if the recipe includes how to reheat leftovers)
- Make Ahead Tips
- Dietary Information/Substitutions

Use this exact format:

# [Recipe Name]

## Ingredients

- [ingredient with amount]
- [ingredient with amount]

If the original recipe has ingredient categories, ALWAYS format them like this:

## Ingredients

### [Category Name]:
- [ingredient with amount]
- [ingredient with amount]

### [Another Category]:
- [ingredient with amount]
- [ingredient with amount]

Note: Use concise category names - if category is "For the Meat Sauce", use "### Meat Sauce:"

## Instructions
1. [detailed step]
2. [detailed step]

## Cooking Time and Servings
- Preparation Time: [time] minutes
- Cooking Time: [time] minutes
- Total Time: [time] minutes
- Servings: [number]

## Notes
- [important tips]
- [variations]

## Storage Instructions
- [how to store leftovers]

## Reheating Instructions
- [how to reheat leftovers]

## [Any Other Optional Sections as needed]
- [relevant information]`
          },
          {
            role: "user",
            content: `Extract and format the recipe from this URL: ${url}. Follow the format exactly as specified. Ensure all sections are present and properly formatted.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        stream: false
      });
      
      clearTimeout(timeoutId);
      
      const content = completion.choices[0].message.content || '';
      
      // Post-process the content to ensure all ingredient categories use the ### format
      const processedContent = content.replace(
        /(## Ingredients[\s\S]*?)(?=##|$)/g,
        (match) => {
          // Find lines like "For the Meat Sauce:" or "CHEESE FILLING:" and convert to ### format
          return match.replace(
            /^(\s*)(For the [^:\n]+:|[A-Z][A-Z\s]+:|[A-Za-z\s]+ Filling:|[A-Za-z\s]+ Sauce:|[A-Za-z\s]+ Mixture:)/gm,
            '$1### $2'
          );
        }
      );
      
      // Parse the markdown content
      const titleMatch = processedContent.match(/# (.*)/);
      const title = titleMatch ? titleMatch[1] : url.split('/').pop() || 'Recipe';
      
      // Enhanced ingredients parsing to handle categories
      const ingredientsSection = processedContent.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
      let ingredients: string[] = [];
      let ingredientCategories: Record<string, string[]> = {};
      
      if (ingredientsSection) {
        const ingredientsContent = ingredientsSection[1].trim();
        
        // Check if there are categories (subsections starting with ###)
        const hasCategories = ingredientsContent.includes('### ');
        
        if (hasCategories) {
          // Split content by category headers
          const categoryBlocks = ingredientsContent.split(/(?=### )/);
          
          categoryBlocks.forEach(block => {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) return;
            
            // Extract category name and ingredients
            const categoryMatch = trimmedBlock.match(/### (.*?):\s*([\s\S]*)/);
            if (categoryMatch) {
              const categoryName = categoryMatch[1].trim();
              const categoryIngredients = categoryMatch[2]
                .trim()
                .split('\n')
                .map(line => line.replace(/^[*-] /, '').trim())
                .filter(line => line);
              
              ingredientCategories[categoryName] = categoryIngredients;
              
              // Also add to flat list
              ingredients = [...ingredients, ...categoryIngredients];
            } else {
              // Handle uncategorized ingredients at the top level
              const uncategorizedIngredients = trimmedBlock
                .split('\n')
                .map(line => line.replace(/^[*-] /, '').trim())
                .filter(line => line);
              
              ingredients = [...ingredients, ...uncategorizedIngredients];
            }
          });
        } else {
          // No categories, just extract all ingredients as a flat list
          ingredients = ingredientsContent
            .split('\n')
            .map(line => line.replace(/^[*-] /, '').trim())
            .filter(line => line);
        }
      }
      
      const instructionsMatch = processedContent.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
      const instructions = instructionsMatch
        ? instructionsMatch[1].trim().split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(i => i)
        : [];
      
      // Extract additional optional sections
      const cookingTimeMatch = processedContent.match(/## Cooking Time and Servings\s*([\s\S]*?)(?=##|$)/);
      const cookingInfo = cookingTimeMatch
        ? cookingTimeMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : [];
        
      const notesMatch = processedContent.match(/## Notes\s*([\s\S]*?)(?=##|$)/);
      const notes = notesMatch
        ? notesMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : [];
      
      // Extract optional sections if present
      const nutritionMatch = processedContent.match(/## (Nutritional Information|Nutrition)\s*([\s\S]*?)(?=##|$)/);
      const nutrition = nutritionMatch
        ? nutritionMatch[2].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : null;
      
      const storageMatch = processedContent.match(/## (Storage Instructions|Storage)\s*([\s\S]*?)(?=##|$)/);
      const storage = storageMatch
        ? storageMatch[2].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : null;
      
      const reheatingMatch = processedContent.match(/## (Reheating Instructions|Reheating)\s*([\s\S]*?)(?=##|$)/);
      const reheating = reheatingMatch
        ? reheatingMatch[2].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : null;
      
      const makeAheadMatch = processedContent.match(/## (Make Ahead Tips|Make Ahead)\s*([\s\S]*?)(?=##|$)/);
      const makeAhead = makeAheadMatch
        ? makeAheadMatch[2].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : null;
      
      const dietaryInfoMatch = processedContent.match(/## (Dietary Information|Substitutions|Dietary)\s*([\s\S]*?)(?=##|$)/);
      const dietaryInfo = dietaryInfoMatch
        ? dietaryInfoMatch[2].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
        : null;
      
      return NextResponse.json({
        title,
        ingredients,
        ingredientCategories: Object.keys(ingredientCategories).length > 0 ? ingredientCategories : null,
        instructions,
        cookingInfo: cookingInfo.length > 0 ? cookingInfo : null,
        notes: notes.length > 0 ? notes : null,
        nutrition: nutrition && nutrition.length > 0 ? nutrition : null,
        storage: storage && storage.length > 0 ? storage : null,
        reheating: reheating && reheating.length > 0 ? reheating : null,
        makeAhead: makeAhead && makeAhead.length > 0 ? makeAhead : null,
        dietaryInfo: dietaryInfo && dietaryInfo.length > 0 ? dietaryInfo : null,
        markdown: processedContent,
        original: content,
        method: 'openai-gpt4o-mini',
        url: requestUrl
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('OpenAI recipe extraction error:', error);
    
    return NextResponse.json({
      title: "Recipe Extraction Failed",
      ingredients: ["Could not extract ingredients"],
      instructions: ["Please try again later or manually copy the recipe"],
      markdown: `# Recipe Extraction Failed\n\nWe couldn't extract the recipe automatically. Please try again later, or [View the original recipe here](${requestUrl}).`,
      method: 'error-fallback',
      url: requestUrl // Use the stored URL
    }, { status: 200 });
  }
} 