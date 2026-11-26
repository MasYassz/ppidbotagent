const fs = require('fs');

const testFiles = [
  'test_4_new_requests.js',
  'test_8_new_user_requests.js',
  'test_ai_synthesis.js',
  'test_complete_flow.js',
  'test_faq_rag.js',
  'test_flow_simulation.js',
  'test_multichat_and_grounding.js',
  'test_unclear_and_escalation_fix.js'
];

testFiles.forEach(file => {
  const content = fs.readFileSync('scratch/' + file, 'utf8');
  const lines = content.split('\n');
  console.log(`=== ${file} ===`);
  lines.forEach((l, idx) => {
    if (l.includes('faq.json') || l.includes('faqData') || (l.includes('assert') && l.includes('faq'))) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
});
