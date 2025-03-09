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