const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

let modifiedCount = 0;

walkDir(srcDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Replace DollarSign with IndianRupee
  content = content.replace(/DollarSign/g, 'IndianRupee');
  
  // Specific fix for the POS discount toggle which has a literal '$' alone in JSX
  if (filePath.includes('pos\\page.tsx') || filePath.includes('pos/page.tsx')) {
    content = content.replace(
      />\s*\$\s*<\/button>/g, 
      '>\n                      ₹\n                    </button>'
    );
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified: ${filePath.replace(srcDir, 'src')}`);
  }
});

console.log(`\nFinished replacing DollarSign with IndianRupee in ${modifiedCount} files.`);
