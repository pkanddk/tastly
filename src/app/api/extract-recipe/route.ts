import { NextRequest, NextResponse } from 'next/server';

// Don't import from deepseek.ts to avoid circular dependency
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Implement the recipe extraction logic directly here
    try {
      // Fetch the HTML content from the URL
      console.log(`Fetching content from URL: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Failed to fetch URL: ${url}, status: ${response.status}`);
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`Successfully fetched HTML content, length: ${html.length}`);
      
      const systemPrompt = `You are a helpful assistant that extracts recipe information from HTML content.
      
      IMPORTANT FORMATTING INSTRUCTIONS:
      1. Preserve any subcategories within the ingredients list (e.g., "cheese filling:", "sauce:", etc.)
      2. Include chef tips and storage/reheating instructions in a separate section called "Tips" at the bottom after the instructions.
      3. Structure the recipe in a clear, organized format
      4. If the recipe doesn't have subcategories or chef tips, that's fine - just extract what's available
      
      Extract the following information (if available):
      - Recipe title
      - Ingredients (maintaining any subcategories/groupings)
      - Instructions (step by step)
      - Cooking time
      - Servings
      - Tips (including storage and reheating instructions)
      
      Format the response in markdown.`;
      
      const userPrompt = `Extract the recipe from this HTML content: ${html.substring(0, 15000)}`; // Limit content size
      
      console.log('Sending request to Deepseek API');
      
      // Call DeepSeek API directly using fetch
      const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 4000,
          stream: false
        })
      });
      
      console.log(`Deepseek API response status: ${deepseekResponse.status}`);
      
      if (!deepseekResponse.ok) {
        const errorText = await deepseekResponse.text();
        console.error("Deepseek API error response:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error data:", errorData);
          throw new Error(`Deepseek API error: ${errorData.error?.message || 'Unknown error'}`);
        } catch (parseError) {
          console.error("Failed to parse error response as JSON:", parseError);
          throw new Error(`Deepseek API error: ${deepseekResponse.status} - ${errorText.substring(0, 200)}`);
        }
      }
      
      // Parse the response from Deepseek
      const data = await deepseekResponse.json();
      console.log("Successfully received Deepseek response");
      
      // Return the content directly - it's already in markdown format
      return NextResponse.json(data.choices[0].message.content);
    } catch (error) {
      console.error("Error extracting recipe:", error);
      return NextResponse.json({ 
        error: 'Failed to extract recipe', 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in extract-recipe API:', error);
    return NextResponse.json({ 
      error: 'Failed to extract recipe', 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 