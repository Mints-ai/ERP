const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, '../src/app/dashboard'),
  path.join(__dirname, '../src/components')
];

const replacements = [
  // Backgrounds
  { regex: /\bbg-white\b/g, replacement: 'bg-background' },
  { regex: /\bbg-slate-50\b/g, replacement: 'bg-muted/30' },
  { regex: /\bbg-slate-100\b/g, replacement: 'bg-muted/50' },
  { regex: /\bbg-slate-200\b/g, replacement: 'bg-muted' },
  { regex: /\bbg-slate-800\b/g, replacement: 'bg-secondary' },
  { regex: /\bbg-slate-900\b/g, replacement: 'bg-secondary/80' },
  { regex: /\bbg-gray-50\b/g, replacement: 'bg-muted/30' },
  { regex: /\bbg-gray-100\b/g, replacement: 'bg-muted/50' },
  { regex: /\bbg-gray-800\b/g, replacement: 'bg-secondary' },
  { regex: /\bbg-gray-900\b/g, replacement: 'bg-secondary/80' },
  
  // Text primary
  { regex: /\btext-slate-950\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-900\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-800\b/g, replacement: 'text-foreground' },
  { regex: /\btext-slate-700\b/g, replacement: 'text-foreground/90' },
  { regex: /\btext-gray-900\b/g, replacement: 'text-foreground' },
  { regex: /\btext-gray-800\b/g, replacement: 'text-foreground' },
  { regex: /\btext-black\b/g, replacement: 'text-foreground' },

  // Text secondary
  { regex: /\btext-slate-600\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-500\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-slate-400\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-gray-600\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-gray-500\b/g, replacement: 'text-muted-foreground' },
  { regex: /\btext-gray-400\b/g, replacement: 'text-muted-foreground' },

  // Borders
  { regex: /\bborder-slate-100\b/g, replacement: 'border-border/40' },
  { regex: /\bborder-slate-200\b/g, replacement: 'border-border/60' },
  { regex: /\bborder-slate-300\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-700\b/g, replacement: 'border-border' },
  { regex: /\bborder-slate-800\b/g, replacement: 'border-border/80' },
  { regex: /\bborder-gray-200\b/g, replacement: 'border-border/60' },
  { regex: /\bborder-gray-300\b/g, replacement: 'border-border' },
  { regex: /\bborder-gray-800\b/g, replacement: 'border-border/80' },

  // Hovers
  { regex: /\bhover:bg-slate-50\b/g, replacement: 'hover:bg-muted/30' },
  { regex: /\bhover:bg-slate-100\b/g, replacement: 'hover:bg-muted/50' },
  { regex: /\bhover:bg-slate-800\b/g, replacement: 'hover:bg-secondary' },
  { regex: /\bhover:bg-gray-50\b/g, replacement: 'hover:bg-muted/30' },
  { regex: /\bhover:bg-gray-100\b/g, replacement: 'hover:bg-muted/50' },
  { regex: /\bhover:text-slate-900\b/g, replacement: 'hover:text-foreground' },
  { regex: /\bhover:text-slate-800\b/g, replacement: 'hover:text-foreground' },
  { regex: /\bhover:text-slate-600\b/g, replacement: 'hover:text-muted-foreground' },

  // Rings
  { regex: /\bfocus:ring-slate-400\b/g, replacement: 'focus:ring-ring' },
  { regex: /\bfocus:ring-slate-500\b/g, replacement: 'focus:ring-ring' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  replacements.forEach(r => {
    content = content.replace(r.regex, r.replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated:', filePath);
  }
}

function processDirectory(directory) {
  if (!fs.existsSync(directory)) return;
  
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  });
}

directories.forEach(dir => processDirectory(dir));
console.log('Color replacement script finished.');
