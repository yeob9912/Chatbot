const https = require('https');

async function checkConnectivity() {
    console.log("--- Connectivity Diagnostic ---");

    // 1. Check general internet (Google DNS or similar)
    console.log("1. Checking general internet (google.com)...");
    try {
        await new Promise((resolve, reject) => {
            https.get('https://www.google.com', (res) => {
                console.log(`✅ Success: status ${res.statusCode}`);
                resolve();
            }).on('error', (e) => {
                console.error(`❌ Failed: ${e.message}`);
                reject(e);
            });
        });
    } catch (err) { }

    // 2. Check Gemini API Endpoint specifically
    console.log("\n2. Checking Gemini API endpoint (generativelanguage.googleapis.com)...");
    try {
        await new Promise((resolve, reject) => {
            https.get('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GOOGLE_API_KEY, (res) => {
                console.log(`✅ Success: status ${res.statusCode}`);
                if (res.statusCode === 403 || res.statusCode === 401) {
                    console.log("   (Note: Status 403/401 is actually GOOD connection-wise, it means the API responded even if the key is invalid or restricted)");
                }
                resolve();
            }).on('error', (e) => {
                console.error(`❌ Connection Failed: ${e.message}`);
                reject(e);
            });
        });
    } catch (err) { }

    // 3. Test with fetch (since that's what failed in logs)
    if (globalThis.fetch) {
        console.log("\n3. Testing global fetch directly...");
        try {
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GOOGLE_API_KEY);
            console.log(`✅ Fetch Success: status ${res.status}`);
        } catch (err) {
            console.error(`❌ Fetch Failed: ${err.message}`);
        }
    } else {
        console.log("\n3. Global fetch not available in this Node version.");
    }
}

// Load env
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

checkConnectivity();
