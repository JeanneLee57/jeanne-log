const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { execSync } = require('child_process');

const files = process.argv.slice(2);

const today = new Date().toISOString().split('T')[0];

files.forEach(file => {
  try {
    const filePath = path.resolve(file);
    const content = fs.readFileSync(filePath, 'utf8');

    const parsed = matter(content);
    
    let needsUpdate = false;

    if (!parsed.data.date) {
      parsed.data.date = today;
      needsUpdate = true;
      console.log(`[Timestamp] Added date: ${today} to ${file}`);
    }

    if (needsUpdate) {
      const updatedContent = matter.stringify(parsed.content, parsed.data);
      
      fs.writeFileSync(filePath, updatedContent);
      
      execSync(`git add "${file}"`);
    }
  } catch (error) {
    console.error(`[Timestamp] Error processing ${file}:`, error);
    process.exit(1);
  }
});
