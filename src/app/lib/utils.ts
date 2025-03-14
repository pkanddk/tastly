import { cn } from "@/lib/utils";

export { cn };

export function processRecipeResponse(response: string): any {
  // Clean up markdown formatting
  let processed = response;
  
  // Remove markdown code block markers
  processed = processed.replace(/```markdown\s*/g, '');
  processed = processed.replace(/```\s*$/g, '');
  processed = processed.replace(/'''/g, '');
  
  // Try to parse as JSON if it looks like JSON
  if (processed.trim().startsWith('{') && processed.trim().endsWith('}')) {
    try {
      return JSON.parse(processed);
    } catch (e) {
      // If parsing fails, return as markdown
      console.error('Failed to parse JSON:', e);
    }
  }
  
  // Return as a recipe object with markdown
  return {
    markdown: processed,
    title: extractTitle(processed),
    ingredients: extractIngredients(processed),
    instructions: extractInstructions(processed)
  };
}

function extractTitle(markdown: string): string {
  // Extract title from markdown (usually the first h1)
  const titleMatch = markdown.match(/# (.*)/);
  return titleMatch ? titleMatch[1] : 'Recipe';
}

function extractIngredients(markdown: string): string[] {
  // Extract ingredients section
  const ingredientsMatch = markdown.match(/## Ingredients\s*([\s\S]*?)(?=##|$)/);
  if (!ingredientsMatch) return [];
  
  // Split by lines and clean up
  return ingredientsMatch[1]
    .split('\n')
    .map(line => line.replace(/^[*-] /, '').trim())
    .filter(line => line.length > 0);
}

function extractInstructions(markdown: string): string[] {
  // Extract instructions section
  const instructionsMatch = markdown.match(/## Instructions\s*([\s\S]*?)(?=##|$)/);
  if (!instructionsMatch) return [];
  
  // Split by lines and clean up
  return instructionsMatch[1]
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
} 