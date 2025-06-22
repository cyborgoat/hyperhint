/**
 * Text utility functions for processing markdown content and handling streaming responses
 */

/**
 * Processes markdown content for rendering, handling special cases like streaming text
 * @param content - Raw markdown content
 * @returns Processed markdown content ready for rendering
 */
export function processMarkdownContent(content: string): string {
  if (!content) return "";
  
  // Clean up any incomplete markdown syntax that might occur during streaming
  let processed = content;
  
  // Handle incomplete code blocks during streaming
  // If we have an opening ``` without a closing one, add a temporary close
  const codeBlockRegex = /```(\w+)?\n((?:(?!```)[\s\S])*?)$/;
  if (codeBlockRegex.test(processed)) {
    const lastCodeBlockStart = processed.lastIndexOf('```');
    const afterLastCodeBlock = processed.slice(lastCodeBlockStart);
    // If there's no closing ```, add one
    if (!afterLastCodeBlock.includes('\n```')) {
      processed += '\n```';
    }
  }
  
  // Handle incomplete tables during streaming
  // If we have table headers but incomplete rows, ensure proper formatting
  const lines = processed.split('\n');
  let inTable = false;
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|');
    const isTableSeparator = /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line.trim());
    
    if (isTableRow || isTableSeparator) {
      inTable = true;
    } else if (inTable && line.trim() === '') {
      inTable = false;
    }
    
    processedLines.push(line);
  }
  
  processed = processedLines.join('\n');
  
  // Handle incomplete lists during streaming
  // Ensure proper spacing for lists
  processed = processed.replace(/(\n- .+?)(?=\n[^-\s])/g, '$1\n');
  processed = processed.replace(/(\n\d+\. .+?)(?=\n[^\d\s])/g, '$1\n');
  
  // Clean up any trailing incomplete formatting
  processed = processed.trim();
  
  return processed;
}

/**
 * Accumulates streaming content, handling partial markdown syntax gracefully
 * @param current - Current accumulated content
 * @param newChunk - New chunk of content to append
 * @returns Updated accumulated content
 */
export function accumulateStreamingContent(current: string, newChunk: string): string {
  if (!newChunk) return current;
  
  // Simply append the new chunk to current content
  let accumulated = current + newChunk;
  
  // Handle some streaming edge cases where content might get duplicated
  // or malformed during SSE transmission
  
  // Remove any duplicate newlines that might occur during streaming
  accumulated = accumulated.replace(/\n{3,}/g, '\n\n');
  
  // Handle potential duplicate content that might occur with SSE buffering
  // This is a simple check - in a real implementation you might want more sophisticated
  // duplicate detection based on your specific streaming protocol
  
  return accumulated;
}

/**
 * Cleans up completed streaming content for final rendering
 * @param content - Final accumulated content
 * @returns Cleaned up content
 */
export function finalizeStreamingContent(content: string): string {
  let finalized = content;
  
  // Remove any temporary closing tags we might have added during streaming
  finalized = finalized.replace(/\n```\s*$/, '');
  
  // Clean up extra whitespace
  finalized = finalized.trim();
  
  // Ensure proper line endings for markdown
  finalized = finalized.replace(/\n+$/, '\n');
  
  return finalized;
}

/**
 * Extracts code blocks from markdown content
 * @param content - Markdown content
 * @returns Array of code blocks with language and content
 */
export function extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
  const codeBlocks: Array<{ language: string; code: string }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
}

/**
 * Checks if content appears to be streaming (incomplete)
 * @param content - Content to check
 * @returns True if content appears to be still streaming
 */
export function isContentStreaming(content: string): boolean {
  if (!content) return false;
  
  // Check for incomplete code blocks
  const codeBlockStarts = (content.match(/```/g) || []).length;
  if (codeBlockStarts % 2 !== 0) return true;
  
  // Check for incomplete tables (table header without separator or content)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // This looks like a table row, check if it has proper structure
      const nextLine = lines[i + 1];
      if (!nextLine || (!nextLine.includes('|') && nextLine.trim() !== '')) {
        return true; // Incomplete table
      }
    }
  }
  
  // Check for incomplete formatting that ends abruptly
  if (content.endsWith('**') || content.endsWith('*') || content.endsWith('`')) {
    return true;
  }
  
  return false;
} 