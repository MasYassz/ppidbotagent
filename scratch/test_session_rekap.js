const fs = require('fs');
const path = require('path');
const assert = require('assert');
const tracker = require('../chatTracker');

async function runTests() {
    console.log('=== STARTING SESSION & REKAP PERSISTENCE TESTS ===');

    const testPhone = '62895611894514';
    const testDate = tracker.getTodayDateWIB();

    // 1. Initial State Check
    let initialData = tracker.loadRekapData();
    console.log(`[TEST 1] Initial rekap date: ${initialData.date}, initial records count: ${Object.keys(initialData.records).length}`);
    const existingSessions = Object.values(initialData.records).filter(r => (r.cleanPhone || '').toString() === testPhone).length;
    const baseIndex = existingSessions;

    // 2. Test Multi-Session for Same Phone Number in Same Day
    console.log('\n--- Testing Multi-Session Separation ---');
    
    // Session 1: Inquiry regarding KNMP
    await tracker.recordConversation({
        phone: testPhone,
        text: 'Bagaimana cara mengajukan lokasi Kampung Nelayan Merah Putih (KNMP)?',
        answer: 'Pengusulan lokasi KNMP diajukan oleh Pemda / Dinas Kelautan setempat dengan syarat lahan clean and clear.',
        source: 'BOT',
        aiModel: null,
        status: 'Done'
    });

    let dataAfterS1 = tracker.loadRekapData();
    let s1Record = tracker.findActiveUserRecord(dataAfterS1, testPhone);
    assert(s1Record, 'Session 1 record should be found and active');
    assert.strictEqual(s1Record.sessionIndex, baseIndex + 1, `Session 1 index should be ${baseIndex + 1}`);
    assert.strictEqual(s1Record.id, `${testPhone}_${baseIndex + 1}`, `Session 1 ID should be ${testPhone}_${baseIndex + 1}`);
    console.log(`[PASS] Session 1 recorded successfully: ID=${s1Record.id}, Status=${s1Record.status}`);

    // User closes Session 1 (e.g. typing "ya" or "cukup")
    tracker.closeUserSession(testPhone);
    let dataAfterCloseS1 = tracker.loadRekapData();
    let activeAfterClose = tracker.findActiveUserRecord(dataAfterCloseS1, testPhone);
    assert.strictEqual(activeAfterClose, null, 'Active record should be null after closing session 1');
    console.log('[PASS] Session 1 closed successfully.');

    // Session 2: Different inquiry from same number later in the day (Garam)
    await tracker.recordConversation({
        phone: testPhone,
        text: 'Apa syarat bantuan geomembran untuk tambak garam rakyat?',
        answer: 'Syarat bantuan geomembran KUGAR adalah memiliki kelompok aktif, kartu e-KUSUKA garam, dan lahan tambak.',
        source: 'BOT',
        aiModel: null,
        status: 'Done'
    });

    let dataAfterS2 = tracker.loadRekapData();
    let s2Record = tracker.findActiveUserRecord(dataAfterS2, testPhone);
    assert(s2Record, 'Session 2 record should be found and active');
    assert.strictEqual(s2Record.sessionIndex, baseIndex + 2, `Session 2 index should be ${baseIndex + 2}`);
    assert.strictEqual(s2Record.id, `${testPhone}_${baseIndex + 2}`, `Session 2 ID should be ${testPhone}_${baseIndex + 2}`);
    console.log(`[PASS] Session 2 recorded separately: ID=${s2Record.id}, Status=${s2Record.status}`);

    // User closes Session 2
    tracker.closeUserSession(testPhone);
    console.log('[PASS] Session 2 closed successfully.');

    // Session 3: Live Chat with CS (Pending -> Done)
    await tracker.recordConversation({
        phone: testPhone,
        text: 'Saya ingin konsultasi langsung perihal dugaan pemalsuan surat izin kapal',
        answer: 'Menunggu respon petugas...',
        source: 'PEMOHON',
        aiModel: null,
        status: 'Pending'
    });

    let dataAfterS3Pending = tracker.loadRekapData();
    let s3PendingRecord = tracker.findActiveUserRecord(dataAfterS3Pending, testPhone);
    assert(s3PendingRecord, 'Session 3 pending record should be found');
    assert.strictEqual(s3PendingRecord.sessionIndex, baseIndex + 3, `Session 3 index should be ${baseIndex + 3}`);
    assert.strictEqual(s3PendingRecord.status, 'Pending');
    console.log(`[PASS] Session 3 pending recorded: ID=${s3PendingRecord.id}, Status=Pending`);

    // Admin replies to live chat
    await tracker.recordConversation({
        phone: testPhone,
        text: '',
        answer: 'Halo, surat izin kapal tersebut telah kami verifikasi dan dipastikan palsu. Mohon tidak mentransfer dana apapun.',
        source: 'MANUSIA',
        aiModel: null,
        status: 'Done'
    });

    let dataAfterS3Done = tracker.loadRekapData();
    let s3DoneRecord = dataAfterS3Done.records[`${testPhone}_${baseIndex + 3}`];
    assert.strictEqual(s3DoneRecord.status, 'Done', 'Session 3 status should be updated to Done');
    assert.strictEqual(s3DoneRecord.sumberJawaban, 'MANUSIA', 'Sumber jawaban should be MANUSIA');
    console.log(`[PASS] Session 3 updated by live chat admin: ID=${s3DoneRecord.id}, Status=${s3DoneRecord.status}, Penjawab=${s3DoneRecord.sumberJawaban}`);

    // Admin finishes session with /selesai
    tracker.closeUserSession(testPhone);

    // 3. Test Bot Restart Simulation (Persistence Check)
    console.log('\n--- Testing Bot Restart Persistence ---');
    // Simulate multiple bot stops and restarts
    for (let i = 1; i <= 3; i++) {
        let reloaded = tracker.loadRekapData();
        assert(reloaded.records[`${testPhone}_${baseIndex + 1}`], `Session 1 must exist after restart #${i}`);
        assert(reloaded.records[`${testPhone}_${baseIndex + 2}`], `Session 2 must exist after restart #${i}`);
        assert(reloaded.records[`${testPhone}_${baseIndex + 3}`], `Session 3 must exist after restart #${i}`);
    }
    console.log('[PASS] Bot restart simulation successful: No records were lost or reset across reboots!');

    // 4. Test Excel Recap Generation
    console.log('\n--- Testing Excel Generation with Multiple Sessions ---');
    const recap = await tracker.generateExcelRecap();
    console.log(`[PASS] Excel generated successfully at: ${recap.filePath}`);
    console.log(`Total records in Excel: ${recap.totalRecords}`);
    console.log(`Total Done: ${recap.totalDone}, Total Pending: ${recap.totalPending}, Total Manusia: ${recap.totalManusia}, Total Bot: ${recap.totalBot}`);

    assert(fs.existsSync(recap.filePath), 'Excel file must exist on disk');
    assert(fs.existsSync(recap.csvPath), 'CSV file must exist on disk');

    const userRows = recap.records.filter(r => r.cleanPhone === testPhone || (r.id && r.id.startsWith(testPhone)));
    assert.strictEqual(userRows.length, baseIndex + 3, `There must be exactly ${baseIndex + 3} distinct rows for testPhone in Excel`);
    console.log(`[PASS] Exactly ${userRows.length} distinct rows generated in Excel for the same phone number across different sessions!`);

    userRows.forEach((r, idx) => {
        console.log(`  Row ${idx + 1}: ID=${r.id} | Session=${r.sessionIndex} | Waktu=${r.waktu} | Status=${r.status} | Penjawab=${r.sumberJawaban}`);
        console.log(`    Pertanyaan: ${r.pertanyaan.substring(0, 60)}...`);
        console.log(`    Jawaban: ${r.jawaban.substring(0, 60)}...`);
    });

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
