const fs = require('fs');

const code = fs.readFileSync('c:\\Users\\thays\\OneDrive\\Desktop\\PoC\\codigo\\frontend\\src\\app\\pages\\Insurance.tsx', 'utf8');

let depth = 0;
const lines = code.split('\n');
const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count opening <div>
  const opens = (line.match(/<div/g) || []).length;
  // Count closing </div>
  const closes = (line.match(/<\/div>/g) || []).length;
  
  for (let j = 0; j < opens; j++) {
    stack.push(i + 1);
  }
  for (let j = 0; j < closes; j++) {
    stack.pop();
  }
}

console.log("Unmatched opening div lines:", stack);
