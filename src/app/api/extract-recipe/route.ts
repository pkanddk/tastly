import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Don't import from deepseek.ts to avoid circular dependency
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Set a reasonable timeout for the fetch operation (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Fetch the page content with timeout protection
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        // Pretend to be a regular browser to avoid anti-scraping measures
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use Cheerio to parse the HTML and extract the recipe
    const $ = cheerio.load(html);
    
    // Try to extract structured data first (preferred method)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let foundRecipe = false;
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const script = jsonLdScripts[i];
        const jsonContent = JSON.parse($(script).html() || '{}');
        
        // Check if this is a recipe schema
        if (jsonContent['@type'] === 'Recipe' || 
            (Array.isArray(jsonContent['@graph']) && 
             jsonContent['@graph'].some((item: any) => item['@type'] === 'Recipe'))) {
          
          // Found recipe data, convert to markdown
          const recipeData = Array.isArray(jsonContent['@graph']) 
            ? jsonContent['@graph'].find((item: any) => item['@type'] === 'Recipe')
            : jsonContent;
            
          // Convert structured data to markdown for consistent display
          const markdown = convertStructuredRecipeToMarkdown(recipeData);
          
          // Return the markdown
          foundRecipe = true;
          return NextResponse.json({ markdown });
        }
      } catch (e) {
        // Continue to next script if parsing fails
        console.error('Error parsing JSON-LD script:', e);
      }
    }
    
    // If no structured data found, try to extract from HTML
    if (!foundRecipe) {
      // Look for common recipe containers
      const recipeContainers = [
        '.recipe-content',
        '.recipe',
        '.recipe-container',
        '[itemtype="http://schema.org/Recipe"]',
        '.wprm-recipe',
        '.tasty-recipes',
        '.recipe-card',
        // Add more selectors as needed
      ];
      
      let recipeContent = '';
      
      for (const selector of recipeContainers) {
        if ($(selector).length) {
          recipeContent = $(selector).html() || '';
          break;
        }
      }
      
      // If we found HTML content, convert it to markdown
      if (recipeContent) {
        // Extract title
        const title = $('h1').first().text() || $('title').text() || 'Recipe';
        
        // Basic HTML to markdown conversion
        const markdown = `# ${title}\n\n${convertHtmlToMarkdown(recipeContent)}`;
        return NextResponse.json({ markdown });
      }
    }
    
    // If we still don't have recipe content, return an error
    return NextResponse.json({ error: 'Could not extract recipe from the provided URL' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Recipe extraction error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Recipe extraction timed out' }, { status: 408 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to extract recipe' }, { status: 500 });
  }
}

// Helper function to convert HTML to markdown
function convertHtmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  let markdown = '';
  
  // Extract ingredients
  const ingredients = $('.ingredients, .recipe-ingredients, .wprm-recipe-ingredients')
    .find('li')
    .map((i, el) => $(el).text().trim())
    .get();
  
  if (ingredients.length > 0) {
    markdown += '## Ingredients\n\n';
    ingredients.forEach(ingredient => {
      markdown += `- ${ingredient}\n`;
    });
    markdown += '\n';
  }
  
  // Extract instructions
  const instructions = $('.instructions, .recipe-instructions, .wprm-recipe-instructions')
    .find('li, p')
    .map((i, el) => $(el).text().trim())
    .get();
  
  if (instructions.length > 0) {
    markdown += '## Instructions\n\n';
    instructions.forEach((instruction, index) => {
      markdown += `${index + 1}. ${instruction}\n`;
    });
    markdown += '\n';
  }
  
  // If we couldn't extract structured content, just convert the HTML to text
  if (markdown.trim() === '') {
    // Remove scripts and styles
    $('script, style').remove();
    
    // Get text content
    const text = $('body').text().trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n\n');
    
    markdown = text;
  }
  
  return markdown;
}

// Helper function to convert structured recipe data to markdown
function convertStructuredRecipeToMarkdown(recipe) {
  let markdown = '';
  
  // Add title
  if (recipe.name) {
    markdown += `# ${recipe.name}\n\n`;
  }
  
  // Add description
  if (recipe.description) {
    markdown += `${recipe.description}\n\n`;
  }
  
  // Add metadata
  if (recipe.prepTime) {
    markdown += `Prep Time: ${formatTime(recipe.prepTime)}\n`;
  }
  
  if (recipe.cookTime) {
    markdown += `Cook Time: ${formatTime(recipe.cookTime)}\n`;
  }
  
  if (recipe.totalTime) {
    markdown += `Total Time: ${formatTime(recipe.totalTime)}\n`;
  }
  
  if (recipe.recipeYield) {
    markdown += `Servings: ${recipe.recipeYield}\n`;
  }
  
  markdown += '\n';
  
  // Add ingredients
  if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
    markdown += `## Ingredients\n\n`;
    
    recipe.recipeIngredient.forEach(ingredient => {
      markdown += `- ${ingredient}\n`;
    });
    
    markdown += '\n';
  }
  
  // Add instructions
  if (recipe.recipeInstructions) {
    markdown += `## Instructions\n\n`;
    
    if (Array.isArray(recipe.recipeInstructions)) {
      recipe.recipeInstructions.forEach((instruction, index) => {
        const step = typeof instruction === 'string' 
          ? instruction 
          : instruction.text || '';
          
        if (step) {
          markdown += `${index + 1}. ${step}\n`;
        }
      });
    } else if (typeof recipe.recipeInstructions === 'string') {
      markdown += recipe.recipeInstructions;
    }
    
    markdown += '\n';
  }
  
  return markdown;
}

// Helper function to format ISO duration to human readable
function formatTime(isoTime) {
  if (!isoTime) return '';
  
  // Handle simple minute/hour formats
  if (isoTime.includes('M') && !isoTime.includes('H')) {
    const minutes = isoTime.match(/PT(\d+)M/)?.[1];
    return minutes ? `${minutes} minutes` : isoTime;
  }
  
  if (isoTime.includes('H')) {
    const hours = isoTime.match(/PT(\d+)H/)?.[1];
    const minutes = isoTime.match(/(\d+)M/)?.[1];
    
    if (hours && minutes) {
      return `${hours} hours ${minutes} minutes`;
    } else if (hours) {
      return `${hours} hours`;
    }
  }
  
  return isoTime;
} 