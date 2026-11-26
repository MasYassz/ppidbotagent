const fs = require('fs');
const faq = JSON.parse(fs.readFileSync('faq.json', 'utf8'));

function findBestFaqMatch(text) {
    if (!text || typeof text !== 'string') return null;
    const t = text.toLowerCase().trim();
    let bestMatch = null;
    let longestKeywordLength = 0;

    for (const item of faq) {
        for (const kw of item.keywords) {
            const kwLower = kw.toLowerCase().trim();
            if (!kwLower) continue;

            const isMatch = kwLower.length <= 4
                ? new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t)
                : t.includes(kwLower);

            if (isMatch && kwLower.length > longestKeywordLength) {
                longestKeywordLength = kwLower.length;
                bestMatch = item.answer;
            }
        }
    }
    return bestMatch;
}

const q1 = 'syarat jadi awak kapal perikanan apa';
const q2 = 'pengumuman akp bisa saya lihat dimana';
const q3 = 'daftar akp error, skck saya gabisa di uplod';
const q4 = 'lapor penangkapan penyu ilegal di pantai';

console.log('Q1 Match:', findBestFaqMatch(q1) ? findBestFaqMatch(q1).replace(/\n/g, ' ').slice(0, 80) : 'NULL');
console.log('Q2 Match:', findBestFaqMatch(q2) ? findBestFaqMatch(q2).replace(/\n/g, ' ').slice(0, 80) : 'NULL');
console.log('Q3 Match:', findBestFaqMatch(q3) ? findBestFaqMatch(q3).replace(/\n/g, ' ').slice(0, 80) : 'NULL');
console.log('Q4 Match:', findBestFaqMatch(q4) ? findBestFaqMatch(q4).replace(/\n/g, ' ').slice(0, 80) : 'NULL');
