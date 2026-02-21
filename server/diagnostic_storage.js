const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Document = require('./models/Document');
const Chunk = require('./models/Chunk');

async function diagnostic() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully.\n");

        const latestDocs = await Document.find().sort({ uploadDate: -1 }).limit(3);

        for (const doc of latestDocs) {
            console.log(`--- Document: ${doc.filename} ---`);
            console.log(`ID: ${doc._id}`);
            console.log(`Status: ${doc.status}`);
            console.log(`Type: ${doc.contentType}`);

            const chunks = await Chunk.find({ docId: doc._id });
            console.log(`Found ${chunks.length} chunks.`);

            if (chunks.length > 0) {
                const firstChunk = chunks[0];
                console.log(`First chunk text snippet: "${firstChunk.text.substring(0, 50)}..."`);
                console.log(`Embedding exists: ${!!firstChunk.embedding}`);
                if (firstChunk.embedding) {
                    console.log(`Embedding dimensions: ${firstChunk.embedding.length}`);
                }
            }
            console.log("\n");
        }

        process.exit(0);
    } catch (err) {
        console.error("Diagnostic Error:", err);
        process.exit(1);
    }
}

diagnostic();
