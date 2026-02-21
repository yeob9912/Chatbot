const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { embedText, vectorSearch } = require('./utils/rag');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Correctly initialize genAI for the listing part
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function diagnostic() {
    try {
        console.log("=== RAG Diagnostic Start ===");
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected.");

        const testText = "ASTU is Adama Science and Technology University located in Adama, Ethiopia. It was established in 1993.";
        console.log("\nTesting Embedding Generation...");
        const embedding = await embedText(testText, true);
        console.log(`✅ Embedding generated. Dimension: ${embedding.length}`);

        if (embedding.length !== 3072) {
            console.error(`❌ ERROR: Embedding dimension is ${embedding.length}, expected 3072.`);
        } else {
            console.log("✅ Embedding dimension matches requirement (3072).");
        }

        console.log("\nTesting Vector Search...");
        const results = await vectorSearch("Where is ASTU located?");
        console.log(`✅ Vector search completed. Results count: ${results.length}`);

        if (results.length > 0) {
            console.log("Top result snippet:", results[0].text.substring(0, 50) + "...");
        } else {
            console.log("⚠️ No results found in search. This is expected if the DB chunks don't exist yet.");
        }

        console.log("\n=== RAG Diagnostic End ===");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ Diagnostic Failed:");
        console.error(err);
        process.exit(1);
    }
}

diagnostic();
