const fs = require('fs');

function formatReply(text) {
    if (!text || typeof text !== 'string') return text;
    let cleaned = text.trim();

    // Cek jika sudah diawali variasi sapaan dengan nama "Halo #SahabatBahari Kak [Nama]," atau nama di baris kedua
    const regexWithName = /^(\*|_)*(halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*(kak\s+[^\n,]+)[!,:-]?\s*/i;
    const matchName = cleaned.match(regexWithName);
    if (matchName) {
        cleaned = cleaned.replace(regexWithName, `Halo #SahabatBahari ${matchName[4].trim()},\n\n`);
        return cleaned;
    }

    // Cek jika sudah diawali variasi standar "Halo Sahabat Bahari", "#SahabatBahari", dsb
    const regex = /^(\*|_)*(halo\s+)?#?sahabat\s*bahari(\*|_)*[!,:-]?\s*/i;
    if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, 'Halo #SahabatBahari,\n\n');
    } else {
        cleaned = `Halo #SahabatBahari,\n\n${cleaned}`;
    }

    return cleaned;
}

const input1 = 'Halo #SahabatBahari Kak Mila Akmalia,\n\nPendaftaran...';
console.log('OUTPUT 1:');
console.log(JSON.stringify(formatReply(input1)));

const input2 = 'Halo #SahabatBahari,\n\nKak Mila Akmalia,\n\nPendaftaran...';
console.log('OUTPUT 2:');
console.log(JSON.stringify(formatReply(input2)));
console.log('OUTPUT 2 PROSE:\n' + formatReply(input2));
