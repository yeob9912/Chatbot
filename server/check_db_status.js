const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Document = require('./models/Document');
const Chunk = require('./models/Chunk');

async function check() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully.\n");

        const docCount = await Document.countDocuments();
        const chunkCount = await Chunk.countDocuments();

        console.log(`Documents total: ${docCount}`);
        console.log(`Chunks total: ${chunkCount}`);

        if (docCount > 0) {
            console.log("\nLast 5 Documents:");
            const docs = await Document.find().sort({ uploadDate: -1 }).limit(5);
            docs.forEach(d => {
                console.log(`- [${d.status}] ${d.filename} (${d.contentType}) - ID: ${d._id}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
