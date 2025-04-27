// This script will help clean up your globals.css file by removing the problematic CSS
// It uses Node's fs module to read the file, remove the problematic lines, and write it back

const fs = require('fs');
const path = require('path');

// Path to your globals.css file
const cssFilePath = path.join(__dirname, 'app', 'globals.css');

try {
  // Read the file
  let cssContent = fs.readFileSync(cssFilePath, 'utf8');
  
  // Count lines before for verification
  const lineCountBefore = cssContent.split('\n').length;
  
  // Find and remove the problematic patterns
  // This regex looks for CSS class definitions with escaped bracket notation and negative values
  const regex = /\.\\\[-\d+\\:-\d+\\\]\s*\{\s*-\d+\s*:\s*-\d+\s*;\s*\}/g;
  cssContent = cssContent.replace(regex, '/* Removed problematic CSS */');
  
  // Count lines after for verification
  const lineCountAfter = cssContent.split('\n').length;
  
  // Write the file back
  fs.writeFileSync(cssFilePath, cssContent);
  
  console.log(`Successfully processed globals.css`);
  console.log(`Lines before: ${lineCountBefore}, Lines after: ${lineCountAfter}`);
  console.log(`Removed problematic CSS classes with negative values`);
  
} catch (error) {
  console.error(`Error processing globals.css:`, error);
}
