const fs = require('fs');
const code = fs.readFileSync(`${__dirname}/temp_dash.tsx`, 'utf8');
fs.writeFileSync('app/app/dashboard/page.tsx', code, { encoding: 'utf8', flag: 'w' });
console.log('Written successfully');
