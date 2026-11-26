const fs = require('fs');
const faq = JSON.parse(fs.readFileSync('faq.json', 'utf8'));

console.log('Total items in faq.json:', faq.length);
faq.forEach((item, idx) => {
  const kw = (item.keywords || []).slice(0, 4).join(', ');
  const firstLine = (item.answer || '').split('\n').filter(l => l.trim().length > 0)[0] || '';
  const cleanLine = firstLine.replace(/[*#🏢🕰️💰📱📞📧🌐🚨🐢💡🐟🧭⚓📑🔍⚖️🌾💻📜🧪]/g, '').trim();
  console.log(`${idx + 1}. [${kw}] -> ${cleanLine.substring(0, 50)}`);
});
