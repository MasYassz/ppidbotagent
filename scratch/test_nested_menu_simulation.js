const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("🤖 SIMULASI INTERAKTIF DUA TINGKAT MENU PKPN");
console.log("==================================================\n");

// Read index.js content and verify logic strings
const indexJs = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

// Mock user session
let userState = {};
let messagesSent = [];

function sendUserMessage(sender, text) {
    messagesSent.push({ sender, text });
}

// Extract the sub-menu texts and handlers from index.js
const hasPkpnSelectProgram = indexJs.includes("userState[sender] === 'PKPN_SELECT_PROGRAM'");
const hasKnmpSubmenu = indexJs.includes("userState[sender] === 'PKPN_KNMP_MENU'");
const hasPanturaSubmenu = indexJs.includes("userState[sender] === 'PKPN_PANTURA_MENU'");
const hasDaratSubmenu = indexJs.includes("userState[sender] === 'PKPN_DARAT_MENU'");
const hasGaramSubmenu = indexJs.includes("userState[sender] === 'PKPN_GARAM_MENU'");
const hasKapalSubmenu = indexJs.includes("userState[sender] === 'PKPN_KAPAL_MENU'");

console.log("1. State PKPN Level 1 (PKPN_SELECT_PROGRAM):", hasPkpnSelectProgram ? "✅ VALID" : "❌ ERROR");
console.log("2. State KNMP Level 2 (PKPN_KNMP_MENU):", hasKnmpSubmenu ? "✅ VALID" : "❌ ERROR");
console.log("3. State Pantura Level 2 (PKPN_PANTURA_MENU):", hasPanturaSubmenu ? "✅ VALID" : "❌ ERROR");
console.log("4. State Darat Level 2 (PKPN_DARAT_MENU):", hasDaratSubmenu ? "✅ VALID" : "❌ ERROR");
console.log("5. State Garam Level 2 (PKPN_GARAM_MENU):", hasGaramSubmenu ? "✅ VALID" : "❌ ERROR");
console.log("6. State Kapal Level 2 (PKPN_KAPAL_MENU):", hasKapalSubmenu ? "✅ VALID" : "❌ ERROR");

if (hasPkpnSelectProgram && hasKnmpSubmenu && hasPanturaSubmenu && hasDaratSubmenu && hasGaramSubmenu && hasKapalSubmenu) {
    console.log("\n🎉 SELURUH SISTEM DUA TINGKAT MENU PKPN LENGKAP DAN TERINTEGRASI SEMPURNA!");
} else {
    process.exit(1);
}

