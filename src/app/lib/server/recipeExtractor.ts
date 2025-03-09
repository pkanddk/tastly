// This file should only be imported in server components or API routes
import { load } from 'cheerio';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

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

// Update the simple extraction function to be even more efficient:
export async function extractRecipeSimple(url: string) {
  try {
    console.log("Using simplified DeepSeek extraction for mobile:", url);
    
    // Generate a cache key
    const cacheKey = `simple:${url}`;
    
    // Check cache first
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached simple recipe for:", url);
      return cachedItem.data;
    }
    
    // First, try to fetch the HTML content
    const html = await fetchHtml(url);
    
    // Use cheerio to extract basic information
    const $ = load(html);
    const title = $('title').text().trim();
    
    // Use a very minimal prompt
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }
    
    // Create a very focused prompt with minimal content
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
            content: `You are a recipe extraction assistant. Extract only the ingredients and instructions in a simple format. Be very concise.`
          },
          {
            role: "user",
            content: `Extract the recipe from this URL: ${url}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500 // Reduced even further
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Format the result in a simple way
    let result = `# ${title}\n\nFrom: ${url}\n\n${content}`;
    
    // Cache the result
    recipeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error("Simple DeepSeek extraction error:", error);
    throw error;
  }
}

export async function extractRecipe(url: string, isMobile: boolean = false) {
  try {
    console.log(`Extracting recipe from ${url} (mobile: ${isMobile})`);
    
    // Generate a cache key based on the URL and device type
    const cacheKey = `${url}:${isMobile ? 'mobile' : 'desktop'}`;
    
    // Check if we have a cached result that's not expired
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached recipe for:", url);
      return cachedItem.data;
    }
    
    // Set a reasonable timeout for the fetch operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    // Fetch the page content
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': isMobile 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use Cheerio to parse the HTML
    const $ = cheerio.load(html);
    
    // Remove navigation, header, footer, and other non-content elements
    $('nav, header, footer, aside, .nav, .menu, .navigation, .header, .footer, .sidebar, #nav, #menu, #header, #footer, #sidebar').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $('script, style, comment, iframe, .ad, .ads, .advertisement').remove();
    
    // Get the page title - prefer recipe-specific titles
    const recipeTitle = $('.recipe-title, .recipe-name, [itemprop="name"], h1').first().text().trim();
    const pageTitle = $('title').text().trim();
    const title = recipeTitle || pageTitle || 'Recipe';
    
    // Extract ingredients - focus on recipe-specific elements first
    const ingredients: string[] = [];
    
    // Look for structured recipe data
    $('[itemprop="recipeIngredient"], .recipe-ingredients li, .ingredients li').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3 && text.length < 200 && !ingredients.includes(text)) {
        // Filter out navigation items and other non-ingredient text
        if (!isNavigationOrMenuText(text)) {
          ingredients.push(text);
        }
      }
    });
    
    // If we didn't find ingredients in structured data, look in regular lists
    if (ingredients.length === 0) {
      // Find the most likely ingredient list by looking for lists with food-related terms
      $('ul').each((i, el) => {
        const listText = $(el).text().trim();
        // Check if this list contains food-related terms
        if (/cup|tbsp|tsp|oz|g|kg|ml|l|pound|teaspoon|tablespoon|salt|pepper|sugar|flour|oil|butter|garlic|onion/i.test(listText)) {
          $(el).find('li').each((j, li) => {
            const text = $(li).text().trim();
            if (text && text.length > 3 && text.length < 200 && !ingredients.includes(text)) {
              // Filter out navigation items and other non-ingredient text
              if (!isNavigationOrMenuText(text)) {
                ingredients.push(text);
              }
            }
          });
        }
      });
    }
    
    // Extract instructions - focus on recipe-specific elements first
    const instructions: string[] = [];
    
    // Look for structured recipe data
    $('[itemprop="recipeInstructions"], .recipe-instructions li, .instructions li, .directions li, .steps li').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10 && text.length < 500 && !instructions.includes(text)) {
        // Filter out navigation items and other non-instruction text
        if (!isNavigationOrMenuText(text)) {
          instructions.push(text);
        }
      }
    });
    
    // If we didn't find instructions in structured data, look in regular lists or paragraphs
    if (instructions.length === 0) {
      // Find the most likely instruction list by looking for ordered lists or paragraphs with step-like content
      $('ol').each((i, el) => {
        $(el).find('li').each((j, li) => {
          const text = $(li).text().trim();
          if (text && text.length > 10 && text.length < 500 && !instructions.includes(text)) {
            // Filter out navigation items and other non-instruction text
            if (!isNavigationOrMenuText(text) && isLikelyInstruction(text)) {
              instructions.push(text);
            }
          }
        });
      });
      
      // If still no instructions, look for paragraphs that might be instructions
      if (instructions.length === 0) {
        $('.recipe-directions p, .recipe-instructions p, .instructions p, .directions p, .steps p').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20 && text.length < 500 && !instructions.includes(text)) {
            if (isLikelyInstruction(text)) {
              instructions.push(text);
            }
          }
        });
      }
    }
    
    // Extract cooking time and servings
    let cookingTime = '';
    let servings = '';
    
    $('[itemprop="totalTime"], [itemprop="cookTime"], [itemprop="prepTime"], .recipe-time, .cook-time, .prep-time').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 100 && !isNavigationOrMenuText(text)) cookingTime = text;
    });
    
    $('[itemprop="recipeYield"], .recipe-yield, .servings, .yield').each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 100 && !isNavigationOrMenuText(text)) servings = text;
    });
    
    // Clean up the ingredients and instructions
    const cleanedIngredients = ingredients
      .map(cleanText)
      .filter(text => text.length > 0 && isLikelyIngredient(text));
    
    const cleanedInstructions = instructions
      .map(cleanText)
      .filter(text => text.length > 0 && isLikelyInstruction(text));
    
    // Create a simple markdown recipe
    const simpleRecipe = `
# ${title}

${cookingTime ? `## Cooking Time\n${cookingTime}\n\n` : ''}
${servings ? `## Servings\n${servings}\n\n` : ''}

## Ingredients
${cleanedIngredients.length > 0 
  ? cleanedIngredients.map(ing => `- ${ing}`).join('\n')
  : '- No ingredients found. Please check the original recipe.'}

## Instructions
${cleanedInstructions.length > 0
  ? cleanedInstructions.map((inst, i) => `${i+1}. ${inst}`).join('\n')
  : '- No instructions found. Please check the original recipe.'}
    `.trim();
    
    const result = {
      title,
      ingredients: cleanedIngredients,
      instructions: cleanedInstructions,
      cookingTime,
      servings,
      markdown: simpleRecipe,
      original: simpleRecipe,
      method: 'simple',
      url
    };
    
    // Cache the result
    recipeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
    
  } catch (error) {
    console.error('Error in recipe extraction:', error);
    throw error;
  }
}

// Helper function to clean text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .trim();
}

// Helper function to check if text is likely a navigation or menu item
function isNavigationOrMenuText(text: string): boolean {
  const navigationTerms = [
    'home', 'about', 'contact', 'login', 'sign in', 'sign up', 'register',
    'search', 'menu', 'profile', 'account', 'help', 'faq', 'privacy',
    'terms', 'copyright', 'subscribe', 'newsletter', 'follow', 'share',
    'print', 'save', 'email', 'pin', 'tweet', 'facebook', 'instagram',
    'twitter', 'pinterest', 'youtube', 'snapchat', 'tiktok', 'linkedin',
    'view all', 'read more', 'see more', 'show more', 'load more',
    'next', 'previous', 'back', 'forward', 'continue', 'submit',
    'breakfast', 'lunch', 'dinner', 'dessert', 'appetizer', 'snack',
    'main dish', 'side dish', 'salad', 'soup', 'bread', 'drink',
    'chicken', 'beef', 'pork', 'seafood', 'pasta', 'vegetable', 'fruit'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Check if the text contains any navigation terms
  return navigationTerms.some(term => lowerText.includes(term)) &&
    // And doesn't contain typical ingredient measurements
    !/\d+\s*(cup|tbsp|tsp|oz|g|kg|ml|l|pound|teaspoon|tablespoon)/i.test(text);
}

// Helper function to check if text is likely an ingredient
function isLikelyIngredient(text: string): boolean {
  // Check for common ingredient patterns
  return (
    // Contains measurements
    /\d+\s*(cup|tbsp|tsp|oz|g|kg|ml|l|pound|teaspoon|tablespoon)/i.test(text) ||
    // Contains common food items
    /salt|pepper|sugar|flour|oil|butter|garlic|onion|chicken|beef|pork|fish|egg|milk|cream|cheese|water|broth|stock/i.test(text)
  ) && text.length < 200; // Ingredients are usually short
}

// Helper function to check if text is likely an instruction
function isLikelyInstruction(text: string): boolean {
  // Check for common instruction patterns
  return (
    // Starts with action verbs
    /^(preheat|mix|stir|add|combine|heat|cook|bake|roast|grill|simmer|boil|fry|sauté|chop|dice|mince|slice|cut|place|put|set|let|allow)/i.test(text) ||
    // Starts with a number (like a step)
    /^\d+\.?\s+/i.test(text) ||
    // Contains cooking-related terms
    /(minute|hour|heat|temperature|oven|stove|pan|pot|bowl|whisk|spatula|knife|cutting board|baking sheet|dish)/i.test(text)
  ) && text.length > 20 && text.length < 500; // Instructions are usually longer than ingredients
}

export async function extractRecipeWithDeepSeekMobile(url: string) {
  try {
    console.log("Using optimized DeepSeek extraction for mobile:", url);
    
    // Generate a cache key
    const cacheKey = `mobile-optimized:${url}`;
    
    // Check cache first
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached mobile recipe for:", url);
      return cachedItem.data;
    }
    
    // Initialize DeepSeek client
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com',
    });
    
    // Use a very minimal prompt with just the URL
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Extract only the ingredients and instructions from recipe URLs. Be extremely concise. Format as markdown with ## Ingredients and ## Instructions sections."
        },
        {
          role: "user",
          content: `Extract the recipe from this URL: ${url}`
        }
      ],
      temperature: 0.1,
      max_tokens: 800, // Reduced token count for mobile
      stream: false
    });
    
    const content = completion.choices[0].message.content || '';
    
    // Parse the markdown content
    const titleMatch = content.match(/# (.*)/);
    const title = titleMatch ? titleMatch[1] : url.split('/').pop() || 'Recipe';
    
    const ingredientsMatch = content.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
    const ingredients = ingredientsMatch 
      ? ingredientsMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
      : [];
    
    const instructionsMatch = content.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
    const instructions = instructionsMatch
      ? instructionsMatch[1].trim().split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(i => i)
      : [];
    
    const result = {
      title,
      ingredients,
      instructions,
      markdown: content,
      original: content,
      method: 'deepseek-mobile',
      url
    };
    
    // Cache the result
    recipeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error in mobile DeepSeek extraction:', error);
    throw error;
  }
}

export async function extractRecipeWithDeepSeekOptimized(url: string, isMobile: boolean = false) {
  try {
    console.log(`Extracting recipe with optimized DeepSeek from ${url} (mobile: ${isMobile})`);
    
    // Generate a cache key
    const cacheKey = `optimized:${url}:${isMobile ? 'mobile' : 'desktop'}`;
    
    // Check cache first
    const cachedItem = recipeCache.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
      console.log("Using cached optimized recipe for:", url);
      return cachedItem.data;
    }
    
    // Fetch the page content
    const response = await fetch(url, { 
      headers: {
        'User-Agent': isMobile 
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Use Cheerio to parse the HTML
    const $ = cheerio.load(html);
    
    // Remove navigation, header, footer, and other non-content elements
    $('nav, header, footer, aside, .nav, .menu, .navigation, .header, .footer, .sidebar, #nav, #menu, #header, #footer, #sidebar').remove();
    $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $('script, style, comment, iframe, .ad, .ads, .advertisement').remove();
    
    // Extract only the relevant content
    let relevantContent = '';
    
    // Look for recipe-specific containers first
    const recipeContainers = $('.recipe, .recipe-container, .recipe-content, article.post, .entry-content, [itemtype*="Recipe"]');
    
    if (recipeContainers.length > 0) {
      // Use the first recipe container found
      relevantContent = recipeContainers.first().text();
    } else {
      // If no recipe container found, look for ingredients and instructions sections
      const ingredientsSection = $('.ingredients, .ingredient-list, [itemprop="recipeIngredient"]').parent();
      const instructionsSection = $('.instructions, .directions, [itemprop="recipeInstructions"]').parent();
      
      if (ingredientsSection.length > 0) {
        relevantContent += ingredientsSection.text() + '\n\n';
      }
      
      if (instructionsSection.length > 0) {
        relevantContent += instructionsSection.text();
      }
      
      // If still no content, use the main content area
      if (!relevantContent.trim()) {
        relevantContent = $('main, #content, .content, article').text();
      }
      
      // If still no content, use a more targeted approach for common recipe sites
      if (!relevantContent.trim() || relevantContent.length > 10000) {
        // For AllRecipes.com
        if (url.includes('allrecipes.com')) {
          // For AllRecipes.com, target only the specific recipe content sections
          const ingredientsList = $('.ingredients-section .ingredients-item-name');
          if (ingredientsList.length > 0) {
            relevantContent = "Ingredients:\n";
            ingredientsList.each((i, el) => {
              relevantContent += $(el).text().trim() + "\n";
            });
            relevantContent += "\n";
          }
          
          const instructionsList = $('.instructions-section .section-body');
          if (instructionsList.length > 0) {
            relevantContent += "Instructions:\n";
            instructionsList.find('p').each((i, el) => {
              relevantContent += (i+1) + ". " + $(el).text().trim() + "\n";
            });
          }
          
          // If we couldn't find the specific elements, try a more general approach
          if (relevantContent.trim().length < 100) {
            relevantContent = $('.recipe-container, .recipe-content, .ingredients-section, .instructions-section').text();
          }
        }
        // For Food Network
        else if (url.includes('foodnetwork.com')) {
          relevantContent = $('.o-Recipe, .o-Ingredients, .o-Method').text();
        }
        // For Epicurious
        else if (url.includes('epicurious.com')) {
          relevantContent = $('.recipe-content, .ingredients, .preparation').text();
        }
      }
    }
    
    // Clean up the content
    relevantContent = relevantContent
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, isMobile ? 3000 : 5000); // Limit content length based on device
    
    // Initialize DeepSeek client
    const openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com',
    });
    
    // Create a prompt with the relevant content
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: isMobile
            ? "Extract only the ingredients and instructions from recipe content. Be extremely concise. Format as markdown with ## Ingredients and ## Instructions sections."
            : "Extract recipes from content. Format as markdown with # Title, ## Ingredients as a list, and ## Instructions as numbered steps."
        },
        {
          role: "user",
          content: `Extract the recipe from this content from ${url}:\n\n${relevantContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: isMobile ? 800 : 2000,
      stream: false
    });
    
    const content = completion.choices[0].message.content || '';
    
    // Parse the markdown content
    const titleMatch = content.match(/# (.*)/);
    const title = titleMatch ? titleMatch[1] : url.split('/').pop() || 'Recipe';
    
    const ingredientsMatch = content.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
    const ingredients = ingredientsMatch 
      ? ingredientsMatch[1].trim().split('\n').map(i => i.replace(/^[*-] /, '').trim()).filter(i => i)
      : [];
    
    const instructionsMatch = content.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
    const instructions = instructionsMatch
      ? instructionsMatch[1].trim().split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(i => i)
      : [];
    
    const result = {
      title,
      ingredients,
      instructions,
      markdown: content,
      original: content,
      method: isMobile ? 'deepseek-mobile-optimized' : 'deepseek-optimized',
      url
    };
    
    // Cache the result
    recipeCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error in optimized DeepSeek extraction:', error);
    throw error;
  }
} 