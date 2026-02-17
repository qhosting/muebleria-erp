
const fs = require('fs');
const path = require('path');

// Read the current next.config.js
const configPath = path.join(__dirname, 'app', 'next.config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

console.log('🔧 Forcing Next.js standalone output...');

// Replace output configuration
configContent = configContent.replace(
  'output: process.env.NEXT_OUTPUT_MODE,',
  'output: \'standalone\','
);

// Write the modified configuration
fs.writeFileSync(configPath, configContent);
console.log('✅ Next.js configuration updated to use standalone output');
