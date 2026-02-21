const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { vectorSearch, generateAnswer } = require('./utils/rag');

async function testRAG() {
    console.log("Starting RAG logic test...");

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("DB Connected.");

        const queries = [
            "Who is the president of USA?",
            "What is ASTU?"
        ];

        for (const query of queries) {
            console.log(`\nTesting Query: "${query}"`);

            console.log("1. Vector Search...");
            const chunks = await vectorSearch(query);
            console.log(`Found ${chunks.length} chunks.`);

            console.log("2. Generating Answer...");
            const stream = await generateAnswer(query, chunks);

            let fullText = "";
            for await (const chunk of stream) {
                const text = chunk.text();
                if (text) {
                    process.stdout.write(text);
                    fullText += text;
                }
            }
            console.log(`\nFinal Text Length: ${fullText.length}`);
        }

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        await mongoose.connection.close();
        console.log("\nDB Connection Closed.");
    }
}

testRAG();
