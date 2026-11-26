const assert = require('assert');
const fs = require('fs');

console.log('--- TEST FOOTER REMOVAL & GREETING FIX ---');
const indexCode = fs.readFileSync('index.js', 'utf8');

// 1. Verify getResolutionFooter returns empty string
const footerFunc = indexCode.match(/function getResolutionFooter\([^\)]*\)\s*\{([\s\S]*?)\}/);
assert(footerFunc && footerFunc[1].includes("return '';"), 'getResolutionFooter must return empty string');
console.log('[PASS] getResolutionFooter returns empty string.');

// 2. Verify formatReply preserves single-line personal greeting
const tracker = require('../chatTracker');
const formatSnippet = indexCode.match(/function formatReply\([^\)]*\)\s*\{([\s\S]*?)\n\}/);
const formatReply = new Function('text', 'tracker', formatSnippet[0] + '\nreturn formatReply(text);');

const testCases = [
    {
        input: 'Halo #SahabatBahari Kak Mila Akmalia,\n\nPendaftaran dan informasi AKP...',
        expectedPrefix: 'Halo #SahabatBahari Kak Mila Akmalia,\n\n'
    },
    {
        input: 'Halo #SahabatBahari,\n\nKak Mila Akmalia,\n\nPendaftaran dan informasi AKP...',
        expectedPrefix: 'Halo #SahabatBahari Kak Mila Akmalia,\n\n'
    },
    {
        input: 'Halo #SahabatBahari,\n\nPendaftaran dan informasi AKP...',
        expectedPrefix: 'Halo #SahabatBahari,\n\n'
    }
];

testCases.forEach((tc, idx) => {
    const res = formatReply(tc.input, tracker);
    assert(res.startsWith(tc.expectedPrefix), `Test case ${idx + 1} failed: got "${res.slice(0, 50)}"`);
});
console.log('[PASS] formatReply neatly aligns personal greetings into single-line header.');

// 3. Verify that FAQ answer + getResolutionFooter ends cleanly with Salam hormat
const faq = JSON.parse(fs.readFileSync('faq.json', 'utf8'));
const getResolutionFooter = new Function(footerFunc[0] + '\nreturn getResolutionFooter;');
const sampleFaqAnswer = faq[50].answer + getResolutionFooter()('');

assert(sampleFaqAnswer.endsWith('Salam hormat.'), 'FAQ response must end cleanly at Salam hormat without footer');
assert(!sampleFaqAnswer.includes('Apakah penjelasan di atas sudah menyelesaikan kebutuhan Anda?'), 'Footer text must be absent');
console.log('[PASS] FAQ answer terminates cleanly at "Salam hormat." with no trailing footer.');

console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
