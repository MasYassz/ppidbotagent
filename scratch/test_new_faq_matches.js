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

const qPenyu = 'saya melihat ada penangkapan penyu';
const qPulau = 'saya ingin bertanya terkait dengan penggunaan pulau';
const qKdmpKnmp = 'kontak satgas pembangunan knmp';
const qSdmao = 'kontak sdmao';

console.log('qPenyu Match:', findBestFaqMatch(qPenyu) ? findBestFaqMatch(qPenyu).slice(0, 80).replace(/\n/g, ' ') : 'NULL');
console.log('qPulau Match:', findBestFaqMatch(qPulau) ? findBestFaqMatch(qPulau).slice(0, 80).replace(/\n/g, ' ') : 'NULL');
console.log('qKdmpKnmp Match:', findBestFaqMatch(qKdmpKnmp) ? findBestFaqMatch(qKdmpKnmp).slice(0, 80).replace(/\n/g, ' ') : 'NULL');
console.log('qSdmao Match:', findBestFaqMatch(qSdmao) ? findBestFaqMatch(qSdmao).slice(0, 80).replace(/\n/g, ' ') : 'NULL');
