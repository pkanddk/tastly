import { AnthropicStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the HTML content from the provided URL
    const response = await fetch(url);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch content from URL: ${response.status} ${response.statusText}` 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const htmlContent = await response.text();

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `Extract the recipe from this HTML content. Return a JSON object with the following structure:
            {
              "title": "Recipe Title",
              "description": "Recipe description",
              "ingredients": ["ingredient 1", "ingredient 2", ...],
              "instructions": ["step 1", "step 2", ...],
              "prepTime": "preparation time",
              "cookTime": "cooking time",
              "totalTime": "total time",
              "servings": "number of servings",
              "calories": "calorie count if available",
              "image": "URL to recipe image if available"
            }
            
            HTML content:
            ${htmlContent}
            
            Return ONLY valid JSON without any additional text or explanation.`
          }
        ],
        stream: false,
      }),
    });

    const data = await anthropicResponse.json();
    
    // Check if the response has the expected structure
    if (!data.content || !data.content[0] || !data.content[0].text) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Anthropic API', 
          details: 'The response does not contain the expected data structure',
          response: data
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const content = data.content[0].text;
    
    // Try to parse the content as JSON to ensure it's valid
    try {
      JSON.parse(content);
    } catch (parseError) {
      // If it's not valid JSON, try to extract JSON from the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return new Response(jsonMatch[0], {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse recipe data', 
            details: 'The response is not valid JSON',
            content: content
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Return the content directly
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Recipe extraction error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to extract recipe', details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 