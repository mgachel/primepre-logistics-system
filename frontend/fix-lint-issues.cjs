const fs = require('fs');
const path = require('path');

// Function to fix unused imports and variables
function fixFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  fixes.forEach(fix => {
    if (fix.type === 'removeImport') {
      // Remove unused imports
      content = content.replace(new RegExp(`\\s*${fix.name},?`, 'g'), '');
      content = content.replace(new RegExp(`,\\s*${fix.name}`, 'g'), '');
    } else if (fix.type === 'prefixUnderscore') {
      // Add underscore prefix to unused variables
      content = content.replace(new RegExp(`\\b${fix.name}\\b`, 'g'), `_${fix.name}`);
    } else if (fix.type === 'replace') {
      // Direct replacement
      content = content.replace(fix.from, fix.to);
    }
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${filePath}`);
}

// Define fixes for different files
const fixes = {
  'src/pages/ForgotPassword.tsx': [
    { type: 'removeImport', name: 'KeySquare' }
  ],
  'src/pages/GhanaWarehouse.tsx': [
    { type: 'removeImport', name: 'useMemo' },
    { type: 'prefixUnderscore', name: 'uploading' },
    { type: 'prefixUnderscore', name: 'onUpload' },
    { type: 'prefixUnderscore', name: 'message' },
    { type: 'prefixUnderscore', name: 'total_processed' }
  ],
  'src/pages/Login.tsx': [
    { type: 'removeImport', name: 'CardDescription' },
    { type: 'removeImport', name: 'CardFooter' },
    { type: 'removeImport', name: 'CardHeader' },
    { type: 'removeImport', name: 'CardTitle' },
    { type: 'prefixUnderscore', name: 'getDashboardUrl' },
    { type: 'prefixUnderscore', name: 'getWelcomeMessage' }
  ],
  'src/pages/SeaCargo.tsx': [
    { type: 'removeImport', name: 'MapPin' },
    { type: 'prefixUnderscore', name: 'setSelectedContainer' },
    { type: 'prefixUnderscore', name: 'error' }
  ]
};

// Apply fixes
Object.entries(fixes).forEach(([file, fileFixes]) => {
  const fullPath = path.join(__dirname, file);
  fixFile(fullPath, fileFixes);
});

console.log('Lint fixes completed!');