// This file should only be imported in server components or API routes
import { load } from 'cheerio';
import fetch from 'node-fetch';

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
    // First, try to fetch the HTML content
    const html = await fetchHtml(url);
    
    // Use cheerio to extract basic information
    const $ = load(html);
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Extract visible text from the page (simplified)
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
    
    // Now use DeepSeek API to extract the recipe
    const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }
    
    // Create a prompt based on the extracted information
    const prompt = isMobile 
      ? `Extract the recipe from this webpage with title "${title}". Here's the meta description: "${metaDescription}". Extract the ingredients and instructions in a simple format.`
      : `Extract the recipe from this webpage with title "${title}". Here's the meta description: "${metaDescription}". Extract the title, description, ingredients, instructions, and any other relevant information like cooking time, servings, etc.`;
    
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
            content: `${prompt}\n\nHere's some of the page content: ${bodyText}`
          }
        ],
        temperature: isMobile ? 0.3 : 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
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