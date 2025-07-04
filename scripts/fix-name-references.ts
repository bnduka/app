
import * as fs from 'fs';
import * as path from 'path';

// Function to recursively find all TypeScript files
function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .next directories
      if (!['node_modules', '.next', '.git', 'dist'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Function to fix common patterns in a file
function fixFileNameReferences(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Common patterns to fix
    const fixes = [
      // Select statements - replace name: true with firstName: true, lastName: true
      {
        pattern: /name:\s*true,/g,
        replacement: 'firstName: true,\n        lastName: true,'
      },
      // User property access - replace user.name with template literal
      {
        pattern: /(\w+)\.name\s*\|\|\s*['"][']/g,
        replacement: '`${$1.firstName || \'\'} ${$1.lastName || \'\'}`.trim()'
      },
      // Simple user.name references in contexts where we can safely replace
      {
        pattern: /user\.name/g,
        replacement: '`${user.firstName || \'\'} ${user.lastName || \'\'}`.trim()'
      }
    ];

    for (const fix of fixes) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

// Main execution
async function main() {
  const projectDir = path.join(__dirname, '..');
  console.log('🔧 Finding TypeScript files...');
  
  const tsFiles = findTsFiles(projectDir);
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    // Skip the migration script itself and some files we know are problematic
    if (file.includes('fix-name-references.ts') || 
        file.includes('migrate-user-names.ts') ||
        file.includes('node_modules')) {
      continue;
    }
    
    if (fixFileNameReferences(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n🎉 Fixed ${fixedCount} files with name reference updates`);
}

main().catch(console.error);
