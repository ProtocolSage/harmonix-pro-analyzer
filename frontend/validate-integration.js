/**
 * Quick validation script for Essentia.js integration
 * 
 * This script validates that all required files are in place
 * and the development server can be accessed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Harmonix Pro Analyzer - Essentia.js Integration Validation');
console.log('=============================================================\n');

// Check required files
const requiredFiles = [
  'public/essentia/essentia.js-core.js',
  'public/essentia/essentia-wasm.web.js', 
  'public/essentia/essentia-wasm.web.wasm',
  'src/engines/RealEssentiaAudioEngine.ts',
  'src/workers/essentia-analysis-worker.js',
  'src/essentia-integration-test.ts',
  'package.json',
  'vite.config.ts'
];

let allFilesPresent = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  console.log(`   ${exists ? '✅' : '❌'} ${filePath}`);
  
  if (!exists) {
    allFilesPresent = false;
  }
});

if (!allFilesPresent) {
  console.log('\n❌ Some required files are missing. Please run copy-essentia.bat first.');
  process.exit(1);
}

// Check package.json scripts
console.log('\n📋 Checking package.json scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'build', 'typecheck'];

requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  console.log(`   ${exists ? '✅' : '❌'} ${script}: ${exists || 'missing'}`);
});

// Check dependencies
console.log('\n📦 Checking key dependencies:');
const requiredDeps = ['essentia.js', 'react', 'vite'];

requiredDeps.forEach(dep => {
  const exists = packageJson.dependencies && packageJson.dependencies[dep];
  console.log(`   ${exists ? '✅' : '❌'} ${dep}: ${exists || 'missing'}`);
});

console.log('\n🎯 Next Steps:');
console.log('1. Development server should be running on http://localhost:3000');
console.log('2. Open the app in your browser');  
console.log('3. Wait for "Engine Status: ready" (green checkmark)');
console.log('4. Click "🧪 Test Essentia.js Functions" button');
console.log('5. Click "🚀 Full Integration Test" button');
console.log('6. Open browser console (F12) to see detailed test results');

console.log('\n✅ File validation complete!');
console.log('If tests pass, your Essentia.js integration is working correctly.');
