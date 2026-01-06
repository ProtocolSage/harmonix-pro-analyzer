#!/usr/bin/env node

/**
 * Integration Test Script for Harmonix Pro Analyzer
 * Tests all major component integrations and system health
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Harmonix Pro Analyzer - Integration Test Suite');
console.log('================================================\n');

const srcDir = path.join(__dirname, 'src');
const errors = [];
const warnings = [];

// Test 1: Check all required files exist
console.log('📁 Testing file structure...');
const requiredFiles = [
  'main.tsx',
  'App-Production.tsx',
  'engines/RealEssentiaAudioEngine.ts',
  'engines/RealtimeVisualizationEngine.ts',
  'engines/StreamingAnalysisEngine.ts',
  'engines/VisualizationEngine.ts',
  'components/FileUpload.tsx',
  'components/AnalysisResults.tsx',
  'components/TransportControls.tsx',
  'components/ExportFunctionality.tsx',
  'components/NotificationSystem.tsx',
  'components/ProgressIndicators.tsx',
  'utils/ErrorHandler.ts',
  'utils/PerformanceMonitor.ts',
  'utils/CanvasOptimizer.ts',
  'utils/HealthCheck.ts',
  'types/audio.ts',
  'styles/index.css',
  'styles/glassmorphic.css'
];

let filesFound = 0;
requiredFiles.forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    filesFound++;
    console.log(`  ✅ ${file}`);
  } else {
    errors.push(`Missing required file: ${file}`);
    console.log(`  ❌ ${file}`);
  }
});

console.log(`\n📊 Files: ${filesFound}/${requiredFiles.length} found\n`);

// Test 2: Check for import/export consistency
console.log('🔗 Testing import/export consistency...');

function checkImportsInFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importLines = content.split('\n').filter(line => 
      line.trim().startsWith('import ') && line.includes('from ')
    );
    
    let localImports = 0;
    importLines.forEach(line => {
      if (line.includes('./') || line.includes('../')) {
        localImports++;
        // Extract the import path
        const match = line.match(/from\s+['"](.+)['"]/);
        if (match) {
          const importPath = match[1];
          const resolvedPath = path.resolve(path.dirname(filePath), importPath);
          
          // Check if the imported file exists (with various extensions)
          const extensions = ['.ts', '.tsx', '.js', '.jsx'];
          let found = false;
          
          for (const ext of extensions) {
            if (fs.existsSync(resolvedPath + ext)) {
              found = true;
              break;
            }
          }
          
          if (!found && fs.existsSync(resolvedPath + '/index.ts')) {
            found = true;
          }
          
          if (!found) {
            warnings.push(`Potential missing import in ${relativePath}: ${importPath}`);
          }
        }
      }
    });
    
    return localImports;
  } catch (error) {
    warnings.push(`Could not read file ${relativePath}: ${error.message}`);
    return 0;
  }
}

let totalImports = 0;
requiredFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    const imports = checkImportsInFile(filePath, file);
    totalImports += imports;
    console.log(`  📦 ${file}: ${imports} local imports`);
  }
});

console.log(`\n📊 Total local imports: ${totalImports}\n`);

// Test 3: Check for TypeScript-specific issues
console.log('🔍 Testing TypeScript patterns...');

function checkTypeScriptIssues(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issues = [];
    
    // Check for common issues
    if (content.includes('any') && !content.includes('Record<string, any>')) {
      issues.push('Contains loose "any" types');
    }
    
    if (content.includes('// @ts-ignore') && content.split('// @ts-ignore').length > 3) {
      issues.push('Multiple @ts-ignore comments (potential type issues)');
    }
    
    if (content.includes('useState') && !content.includes('import')) {
      issues.push('Uses React hooks without proper imports');
    }
    
    return issues;
  } catch (error) {
    return [`Could not analyze: ${error.message}`];
  }
}

let totalIssues = 0;
requiredFiles.filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).forEach(file => {
  const filePath = path.join(srcDir, file);
  if (fs.existsSync(filePath)) {
    const issues = checkTypeScriptIssues(filePath, file);
    totalIssues += issues.length;
    
    if (issues.length > 0) {
      console.log(`  ⚠️  ${file}:`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    } else {
      console.log(`  ✅ ${file}: No issues detected`);
    }
  }
});

console.log(`\n📊 TypeScript issues: ${totalIssues}\n`);

// Test 4: Check package.json dependencies
console.log('📦 Testing dependencies...');

try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    'react',
    'react-dom',
    'lucide-react',
    'essentia.js',
    'typescript',
    'vite',
    '@vitejs/plugin-react'
  ];
  
  let depsFound = 0;
  requiredDeps.forEach(dep => {
    if (deps[dep]) {
      depsFound++;
      console.log(`  ✅ ${dep}: ${deps[dep]}`);
    } else {
      errors.push(`Missing dependency: ${dep}`);
      console.log(`  ❌ ${dep}: Not found`);
    }
  });
  
  console.log(`\n📊 Dependencies: ${depsFound}/${requiredDeps.length} found\n`);
} catch (error) {
  errors.push(`Could not read package.json: ${error.message}`);
}

// Test 5: Check build configuration
console.log('⚙️  Testing build configuration...');

const configFiles = [
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js'
];

let configsFound = 0;
configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    configsFound++;
    console.log(`  ✅ ${file}`);
  } else {
    warnings.push(`Missing config file: ${file}`);
    console.log(`  ⚠️  ${file}`);
  }
});

console.log(`\n📊 Config files: ${configsFound}/${configFiles.length} found\n`);

// Test 6: Integration completeness check
console.log('🔗 Testing integration completeness...');

const integrationChecks = [
  {
    name: 'Error Handler Integration',
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('ErrorHandler') && appContent.includes('handleFileError');
    }
  },
  {
    name: 'Performance Monitor Integration', 
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('PerformanceMonitor') && appContent.includes('startTiming');
    }
  },
  {
    name: 'Health Check Integration',
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('HealthCheck') && appContent.includes('SystemHealth');
    }
  },
  {
    name: 'Real Essentia Engine Integration',
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('RealEssentiaAudioEngine');
    }
  },
  {
    name: 'Streaming Analysis Integration',
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('StreamingAnalysisEngine');
    }
  },
  {
    name: 'Notification System Integration',
    check: () => {
      const appContent = fs.readFileSync(path.join(srcDir, 'App-Production.tsx'), 'utf-8');
      return appContent.includes('NotificationProvider') && appContent.includes('useNotificationHelpers');
    }
  }
];

let integrationsComplete = 0;
integrationChecks.forEach(check => {
  try {
    if (check.check()) {
      integrationsComplete++;
      console.log(`  ✅ ${check.name}`);
    } else {
      warnings.push(`Incomplete integration: ${check.name}`);
      console.log(`  ⚠️  ${check.name}`);
    }
  } catch (error) {
    errors.push(`Integration check failed for ${check.name}: ${error.message}`);
    console.log(`  ❌ ${check.name}: Error`);
  }
});

console.log(`\n📊 Integrations: ${integrationsComplete}/${integrationChecks.length} complete\n`);

// Final Report
console.log('📋 INTEGRATION TEST SUMMARY');
console.log('==========================\n');

const totalScore = Math.round(
  ((filesFound / requiredFiles.length) * 0.3 +
   (depsFound / requiredFiles.length) * 0.2 +
   (configsFound / configFiles.length) * 0.1 +
   (integrationsComplete / integrationChecks.length) * 0.4) * 100
);

console.log(`🎯 Overall Integration Score: ${totalScore}/100\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS:');
  errors.forEach(error => console.log(`   • ${error}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   • ${warning}`));
  console.log('');
}

// Recommendations
console.log('💡 RECOMMENDATIONS:');
if (totalScore >= 90) {
  console.log('   ✅ Integration looks excellent! Ready for production build.');
} else if (totalScore >= 75) {
  console.log('   🟡 Integration mostly complete. Review warnings before building.');
} else {
  console.log('   🔴 Integration needs work. Address errors before building.');
}

if (errors.length === 0 && warnings.length <= 2) {
  console.log('   🚀 System ready for production build and deployment!');
}

console.log('\n🏁 Integration test complete!');

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);