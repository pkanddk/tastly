// This file should only be imported in server components or API routes
import { load } from 'cheerio';
import fetch from 'node-fetch';

// Simple in-memory cache
const recipeCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Function to fetch the HTML content of a URL
async function fetchHtml(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching HTML:', error);
    throw error;
  }
}

// Function to extract recipe data using DeepSeek API
export async function extractRecipeWithAI(url: string, isMobile: boolean = false) {
  try {
    // Generate a cache key based on the URL and device type
    const cacheKey = `${url}:${isMobile ? 'mobile' : 'desktop'}`;
    
    // Check if we have a cached result that's not expired
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached recipe for:", url);
      return cachedItem.data;
    }
    
    // First, try to fetch the HTML content
    const html = await fetchHtml(url);
    
    // Use cheerio to extract basic information
    const $ = load(html);
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Look for recipe-specific content first
    const recipeContent = $('.recipe, .recipe-content, .ingredients, .instructions, article, .post-content, .entry-content')
      .map((_, el) => $(el).text())
      .get()
      .join(' ');
    
    // If no recipe-specific content found, use a smaller portion of the body text
    const bodyText = recipeContent || $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000); // Reduced from 5000
    
    // Now use DeepSeek API to extract the recipe
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }
    
    // Create a more focused prompt based on the extracted information
    const prompt = isMobile 
      ? `Extract the recipe from this webpage with title "${title}". Focus only on the ingredients and instructions in a simple format.`
      : `Extract the recipe from this webpage with title "${title}". Extract only the title, ingredients (as a list), and instructions (as steps).`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts recipe information from webpages. 
            ${isMobile ? 'Format the recipe in a simple, easy-to-read format for mobile devices.' : 'Format the recipe in a structured JSON format with title, description, ingredients (as an array), and instructions (as an array).'}`
          },
          {
            role: "user",
            content: `${prompt}\n\nHere's the content: ${bodyText}`
          }
        ],
        temperature: 0.3, // Reduced from 0.7 for more consistent results
        max_tokens: 2000 // Reduced from 4000 to speed up response
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Cache the result before returning
    recipeCache.set(cacheKey, { 
      data: content, 
      timestamp: Date.now() 
    });
    
    // For mobile, return the content as is
    if (isMobile) {
      return content;
    }
    
    // For desktop, try to parse as JSON
    try {
      // Check if the content is already JSON
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        return JSON.parse(content);
      }
      
      // If not, try to extract JSON from the content
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // If no JSON found, return the content as is
      return content;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return content;
    }
  } catch (error) {
    console.error('Error extracting recipe with AI:', error);
    throw error;
  }
}

// Add this function to your recipeExtractor.ts file
export async function extractRecipeSimple(url: string) {
  try {
    console.log("Using simple extraction for mobile:", url);
    
    // Generate a cache key
    const cacheKey = `simple:${url}`;
    
    // Check cache first
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached simple recipe for:", url);
      return cachedItem.data;
    }
    
    // Fetch the HTML
    const html = await fetchHtml(url);
    const $ = load(html);
    
    // Extract basic information
    const title = $('title').text().trim();
    const pageUrl = url;
    
    // Look for common recipe elements
    let ingredients: string[] = [];
    let instructions: string[] = [];
    
    // Try to find ingredients
    $('.ingredients, .ingredient-list, .recipe-ingredients, [itemprop="recipeIngredient"]')
      .find('li, p')
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text && !ingredients.includes(text)) {
          ingredients.push(text);
        }
      });
    
    // Try to find instructions
    $('.instructions, .recipe-instructions, .recipe-steps, [itemprop="recipeInstructions"]')
      .find('li, p')
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text && !instructions.includes(text)) {
          instructions.push(text);
        }
      });
    
    // If we couldn't find structured data, create a simple text summary
    let result = `# ${title}\n\nFrom: ${pageUrl}\n\n`;
    
    if (ingredients.length > 0) {
      result += "## Ingredients\n\n";
      ingredients.forEach(ing => {
        result += `- ${ing}\n`;
      });
      result += "\n";
    }
    
    if (instructions.length > 0) {
      result += "## Instructions\n\n";
      instructions.forEach((step, i) => {
        result += `${i+1}. ${step}\n`;
      });
    }
    
    if (ingredients.length === 0 && instructions.length === 0) {
      result += "Could not automatically extract recipe details.\nPlease visit the original website for the complete recipe.";
    }
    
    // Cache the result
    recipeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error("Simple extraction error:", error);
    throw error;
  }
} 