const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const nodeFetch = globalThis.fetch;

async function checkHealth() {
    console.log("=== Backend & DB Health Check ===");

    // 1. Check DB
    try {
        console.log(`Connecting to MongoDB at: ${process.env.MONGO_URI.split('@')[1] || 'URL HIDDEN'}`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connection: SUCCESS");

        const User = require('./models/User');
        const userCount = await User.countDocuments();
        console.log(`✅ User Collection: ${userCount} users found.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ MongoDB Connection: FAILED");
        console.error(err.message);
    }

    // 2. Check API Locally
    try {
        const response = await fetch('http://127.0.0.1:5100/').catch(() => null);
        if (response) {
            console.log("✅ API Server (http://127.0.0.1:5100/): REACHABLE");
            const data = await response.json();
            console.log("   Server Response:", JSON.stringify(data));
        } else {
            console.log("❌ API Server (http://127.0.0.1:5100/): UNREACHABLE");
        }
    } catch (err) {
        console.error("❌ API Server Check Error:", err.message);
    }

    console.log("=== Health Check End ===");
    process.exit(0);
}

checkHealth();
