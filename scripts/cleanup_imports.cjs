const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix constants.tsx importing from itself
  if (file === 'src/lib/constants.tsx' || file === 'src/lib/constants.ts') {
    content = content.replace(/import \{.*?\} from "\.\.\/lib\/constants";\n/g, '');
  }
  // Fix types/index.ts importing from itself
  if (file === 'src/types/index.ts') {
    content = content.replace(/import type \{.*?\} from "\.\.\/types";\n/g, '');
  }

  // Find all import statements
  const importRegex = /import\s+(?:type\s+)?(?:\{([^}]+)\}|([^{}\n]+))\s+from\s+['"]([^'"]+)['"]/g;
  
  let importsByModule = {};
  let match;
  
  // We don't want to replace everything because of default imports and side-effect imports.
  // Instead of a full AST parser, let's just use Babel to parse, deduplicate and generate!
  // Wait, babel is complex.
});

// Since rewriting imports with Regex is error prone, let's just fix the EXACT duplicate declarations
// that auto_import.cjs caused.
// auto_import.cjs added a block of imports at the VERY TOP of the file.
// Let's just find files where `import { ... } from "lucide-react";` appears multiple times,
// and specifically merge them.

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find all lucide-react named imports
    let lucideImports = [];
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g, (match, p1) => {
        const tokens = p1.split(',').map(s => s.trim()).filter(Boolean);
        lucideImports.push(...tokens);
        return ''; // remove it
    });
    
    if (lucideImports.length > 0) {
        const uniqueLucide = [...new Set(lucideImports)];
        content = `import { ${uniqueLucide.join(', ')} } from "lucide-react";\n` + content;
    }

    // Do the same for lib/utils
    let utilsImports = [];
    let utilsModule = "";
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/lib\/utils|\.\.\/\.\.\/lib\/utils)['"];?/g, (match, p1, p2) => {
        utilsModule = p2;
        const tokens = p1.split(',').map(s => s.trim()).filter(Boolean);
        utilsImports.push(...tokens);
        return '';
    });
    if (utilsImports.length > 0) {
        const uniqueUtils = [...new Set(utilsImports)];
        content = `import { ${uniqueUtils.join(', ')} } from "${utilsModule}";\n` + content;
    }

    // Do the same for lib/constants
    let constsImports = [];
    let constsModule = "";
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/lib\/constants|\.\.\/\.\.\/lib\/constants)['"];?/g, (match, p1, p2) => {
        constsModule = p2;
        const tokens = p1.split(',').map(s => s.trim()).filter(Boolean);
        constsImports.push(...tokens);
        return '';
    });
    if (constsImports.length > 0) {
        const uniqueConsts = [...new Set(constsImports)];
        content = `import { ${uniqueConsts.join(', ')} } from "${constsModule}";\n` + content;
    }

    // Do the same for lib/api
    let apiImports = [];
    let apiModule = "";
    content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/lib\/api|\.\.\/\.\.\/lib\/api)['"];?/g, (match, p1, p2) => {
        apiModule = p2;
        const tokens = p1.split(',').map(s => s.trim()).filter(Boolean);
        apiImports.push(...tokens);
        return '';
    });
    if (apiImports.length > 0) {
        const uniqueApi = [...new Set(apiImports)];
        content = `import { ${uniqueApi.join(', ')} } from "${apiModule}";\n` + content;
    }

    fs.writeFileSync(file, content, 'utf8');
});

console.log('Cleanup complete');
