const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const pdf = require('pdf-parse');
const cheerio = require('cheerio');
const { embedText, chunkText } = require('../utils/rag');

// Use global fetch (Node 18+)
const nodeFetch = globalThis.fetch;

exports.uploadFile = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ msg: 'No file uploaded' });

        const isPdf = file.mimetype.includes('pdf') || file.originalname.toLowerCase().endsWith('.pdf');

        // 1. Create Document Entry
        const newDoc = new Document({
            filename: file.originalname,
            contentType: isPdf ? 'pdf' : 'txt',
            uploadedBy: req.user.id,
            size: file.size,
            status: 'processing'
        });
        await newDoc.save();

        // 2. Extract Text
        let textContent = '';
        if (isPdf) {
            const dataBuffer = file.buffer;
            const data = await pdf(dataBuffer);
            textContent = data.text;
        } else {
            // Text/Other
            textContent = file.buffer.toString('utf8');
        }

        if (!textContent || textContent.trim().length === 0) {
            console.error(`❌ Text extraction failed for ${file.originalname}`);
            throw new Error('Failed to extract text from file. Please ensure it is not empty or an image-only PDF.');
        }

        // 3. Chunk Text
        console.log(`Chunking text (${textContent.length} chars)...`);
        const chunks = await chunkText(textContent);
        if (!chunks || chunks.length === 0) {
            console.error(`❌ Chunking failed for ${file.originalname}`);
            throw new Error('Failed to create chunks from document');
        }

        // 4. Batch Embed & Store Chunks
        console.log(`Generating embeddings for ${chunks.length} chunks...`);
        let embeddings;
        try {
            embeddings = await embedText(chunks, true);
        } catch (embedErr) {
            console.error(`❌ Embedding generation failed:`, embedErr.message);
            throw new Error(`Embedding generation failed: ${embedErr.message}`);
        }

        const chunkDocs = chunks.map((text, index) => ({
            docId: newDoc._id,
            text: text,
            embedding: embeddings[index]
        }));

        console.log(`Step 5: Inserting ${chunkDocs.length} chunks into database...`);
        const savedChunks = await Chunk.insertMany(chunkDocs);
        if (!savedChunks || savedChunks.length === 0) {
            throw new Error('Failed to save chunks to knowledge base');
        }
        console.log(`✅ Successfully saved ${savedChunks.length} chunks to database.`);

        // 6. Update Status
        newDoc.status = 'indexed';
        await newDoc.save();
        console.log(`✅ Document status updated to "indexed" for ${newDoc.filename}`);

        res.json({ msg: 'file message uploaded successfully ', doc: newDoc });
    } catch (err) {
        console.error('❌ uploadFile error:', err);
        if (newDoc) {
            newDoc.status = 'failed';
            await newDoc.save();
        }
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.addUrl = async (req, res) => {
    const { url } = req.body;
    let newDoc = null; // Declare outside try block

    try {
        // 1. Create Doc
        newDoc = new Document({
            filename: url,
            contentType: 'url',
            uploadedBy: req.user.id,
            filePath: url,
            status: 'processing'
        });
        await newDoc.save();

        // 2. Fetch & Extract
        if (!nodeFetch) throw new Error('Fetch is not supported in this Node.js version. Please update to Node 18+');

        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        let response;
        try {
            response = await nodeFetch(url, { signal: controller.signal });
        } catch (fetchErr) {
            if (fetchErr.name === 'AbortError') {
                throw new Error('Connection timed out. The website is taking too long to respond.');
            }
            throw new Error(`Failed to connect to the website: ${fetchErr.message}`);
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText} (${response.status})`);

        const html = await response.text();
        const $ = cheerio.load(html);

        // Improved HTML extraction: focus on article/main/content if possible, then fallback to body
        let textContent = '';
        const mainContent = $('article, main, .content, #content').text();
        if (mainContent && mainContent.trim().length > 200) {
            textContent = mainContent;
        } else {
            textContent = $('body').text();
        }

        textContent = textContent.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();

        if (!textContent || textContent.trim().length < 50) {
            throw new Error('Retrieved content is too short or empty. The URL might be protected or script-heavy.');
        }

        // 3. Chunk
        const chunks = await chunkText(textContent);
        if (!chunks || chunks.length === 0) throw new Error('Failed to create chunks from URL content');

        // 4. Batch Embed & Store
        console.log(`Generating embeddings for ${chunks.length} chunks from URL...`);
        const embeddings = await embedText(chunks, true);
        const chunkDocs = chunks.map((text, index) => ({
            docId: newDoc._id,
            text: text,
            embedding: embeddings[index]
        }));

        console.log(`Step 5: Inserting ${chunkDocs.length} chunks from URL into database...`);
        const result = await Chunk.insertMany(chunkDocs);
        if (!result || result.length === 0) {
            throw new Error('Failed to save chunks from URL');
        }
        console.log(`✅ Successfully saved ${result.length} chunks from URL to database.`);

        newDoc.status = 'indexed';
        await newDoc.save();
        console.log(`✅ URL status updated to "indexed"`);

        res.json({ msg: 'file message uploaded successfully ', doc: newDoc });
    } catch (err) {
        console.error('❌ addUrl error:', err.message);
        if (newDoc) {
            // If document was created, mark it as failed
            try {
                newDoc.status = 'failed';
                await newDoc.save();
            } catch (saveErr) {
                console.error('Failed to update document status to failed:', saveErr.message);
            }
        }
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.addText = async (req, res) => {
    const { title, text, content } = req.body;
    const finalContent = text || content;
    try {
        const newDoc = new Document({
            filename: title,
            contentType: 'txt',
            uploadedBy: req.user.id,
            filePath: 'raw_text', // virtual path
            status: 'processing'
        });
        await newDoc.save();

        const chunks = await chunkText(finalContent);
        if (!chunks || chunks.length === 0) throw new Error('Failed to create chunks from text');

        const embeddings = await embedText(chunks, true);
        const chunkDocs = chunks.map((text, index) => ({
            docId: newDoc._id,
            text: text,
            embedding: embeddings[index]
        }));

        console.log(`Step 5: Inserting chunks from text into database...`);
        const result = await Chunk.insertMany(chunkDocs);
        if (!result || result.length === 0) {
            throw new Error('Failed to save text chunks');
        }
        console.log(`✅ Successfully saved chunks from text to database.`);

        newDoc.status = 'indexed';
        await newDoc.save();
        console.log(`✅ Text status updated to "indexed"`);

        res.json({ msg: 'file message uploaded successfully ', doc: newDoc });
    } catch (err) {
        console.error('❌ addText error:', err);
        if (newDoc) {
            newDoc.status = 'failed';
            await newDoc.save();
        }
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ uploadedBy: req.user.id }).sort({ uploadDate: -1 });
        res.json(docs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ msg: 'Document not found' });

        // Check user
        if (doc.uploadedBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Delete associated chunks
        await Chunk.deleteMany({ docId: doc._id });

        await doc.deleteOne();
        res.json({ msg: 'Document removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
