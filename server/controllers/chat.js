const { vectorSearch, generateAnswer } = require('../utils/rag');
const Chat = require('../models/Chat');
// const User = require('../models/User'); // Not needed without auth

exports.chat = async (req, res) => {
    const { query } = req.body;
    console.log(`\n--- Chat Request Received ---`);
    console.log(`Query: "${query}"`);

    if (!query) {
        console.log("❌ Error: Query is missing");
        return res.status(400).json({ msg: 'Query is required' });
    }

    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
        console.log("❌ Error: User not authorized", req.user);
        return res.status(401).json({ msg: 'User not authorized' });
    }
    console.log(`User ID: ${req.user.id}`);

    let chatDoc;

    try {
        // 1. Search for relevant chunks
        console.log(`Starting vector search for: "${query}"`);
        const contextChunks = await vectorSearch(query);
        console.log(`Vector search complete. Found ${contextChunks.length} chunks.`);

        // 2. Initialize Chat Document
        // For simplicity, we create a new conversation for each request if no chatId is provided.
        // In a more advanced version, we would append to an existing chat.
        const userMessage = { role: 'user', text: query, timestamp: new Date() }; // Corrected 'content' to 'text' based on Schema
        chatDoc = new Chat({
            userId: req.user.id,
            title: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
            messages: [userMessage]
        });
        await chatDoc.save();

        // 3. Set Headers for Streaming (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        // connection closed handling
        req.on('close', () => {
            console.log('Connection closed');
            res.end();
        });

        // 4. Generate Answer (Streaming)
        let fullResponse = "";
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            const stream = await generateAnswer(query, contextChunks);

            for await (const chunk of stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    // console.log(`Streaming chunk: ${chunkText.substring(0, 20)}...`); 
                    res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                    fullResponse += chunkText;
                    await sleep(50); // Artificial delay to regulate streaming speed
                }
            }

            res.write(`data: [DONE]\n\n`);
            res.end();

            // 5. Save Bot Response
            chatDoc.messages.push({
                role: 'model',
                text: fullResponse, // Corrected 'content' to 'text' based on Schema
                timestamp: new Date()
            });
            await chatDoc.save();

        } catch (genError) {
            console.error('Generation Error:', genError);
            const errorMsg = "i have no information about the thing you asked me !";
            res.write(`data: ${JSON.stringify({ text: errorMsg })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();

            // Save error message as well
            chatDoc.messages.push({
                role: 'model',
                text: errorMsg,
                timestamp: new Date()
            });
            await chatDoc.save();
        }
    } catch (err) {
        console.error('Chat Controller Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'Server error' });
        } else {
            res.write(`data: ${JSON.stringify({ text: "Server error occurred" })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
};
