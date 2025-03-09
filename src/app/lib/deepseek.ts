'use client';

// This file is now just a client-side wrapper for the API
export async function extractRecipeFromUrl(url: string) {
  // Detect environment
  const isProd = process.env.NODE_ENV === 'production';
  console.log(`Running in ${isProd ? 'production' : 'development'} environment`);

  try {
    // Make sure this is the correct endpoint path
    const response = await fetch('/api/deepseek/extract-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    // Handle non-OK responses properly
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      throw new Error(`Failed to extract recipe: ${response.status} ${errorText.substring(0, 50)}...`);
    }

    const contentType = response.headers.get('Content-Type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('Error extracting recipe:', error);
    throw error;
  }
}

export async function extractRecipeFromUrlMobile(url: string) {
  try {
    console.log("Mobile extraction for URL:", url);
    
    // Make a direct fetch to the DeepSeek API
    const response = await fetch(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts recipe information from URLs."
          },
          {
            role: "user",
            content: `Extract the recipe from this URL: ${url}. Return the recipe in plain text format.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Mobile extraction error:", error);
    throw error;
  }
} 