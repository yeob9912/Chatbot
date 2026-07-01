import { vectorSearch, generateAnswer } from "../utils/rag.js" ;
import Chat from "../models/Chat.js" ;
import User from "../models/User.js" ;
import Notification from "../models/Notification.js" ;

export const chat = async (req, res) => {
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

        // 2. Initialize or Retrieve Chat Document
        const { chatId } = req.body;
        const userMessage = { role: 'user', text: query, timestamp: new Date() };

        // Duplicate prevention: if the user sent the exact same query in the last 5 seconds, reuse that chat session
        const recentChat = await Chat.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });
        if (recentChat && recentChat.messages.length > 0) {
            const lastMsg = recentChat.messages[recentChat.messages.length - 1];
            if (lastMsg && lastMsg.role === 'user' && lastMsg.text === query) {
                const timeDiff = new Date().getTime() - new Date(lastMsg.timestamp || recentChat.updatedAt).getTime();
                if (timeDiff < 5000) {
                    console.log("Duplicate query in under 5 seconds. Reusing existing chat.");
                    chatDoc = recentChat;
                }
            }
        }

        // If not a rapid duplicate, resolve normally with time difference check (30 minutes session limit)
        if (!chatDoc && chatId) {
            try {
                chatDoc = await Chat.findById(chatId);
                if (chatDoc && chatDoc.messages.length > 0) {
                    const lastMsg = chatDoc.messages[chatDoc.messages.length - 1];
                    const lastTime = new Date(lastMsg.timestamp || chatDoc.updatedAt).getTime();
                    const nowTime = new Date().getTime();
                    const diffMins = (nowTime - lastTime) / (1000 * 60);
                    if (diffMins > 30) {
                        console.log(`Inactivity period is ${diffMins} minutes (> 30 mins). Splitting into new chat session.`);
                        chatDoc = null; // Forces new session
                    }
                }
            } catch (err) {
                console.log("Chat session not found by ID, creating new one");
            }
        }

        if (chatDoc) {
            // Avoid pushing duplicate user message if we are reusing it
            const lastMsg = chatDoc.messages[chatDoc.messages.length - 1];
            if (!lastMsg || lastMsg.text !== query || lastMsg.role !== 'user') {
                chatDoc.messages.push(userMessage);
            }
            chatDoc.updatedAt = new Date();
            await chatDoc.save();
        } else {
            chatDoc = new Chat({
                userId: req.user.id,
                title: query.substring(0, 30) + (query.length > 30 ? '...' : ''),
                messages: [userMessage]
            });
            await chatDoc.save();

            // Create notification for new chat
            try {
                const userObj = await User.findById(req.user.id);
                const userName = userObj ? userObj.name : 'Unknown User';
                const notification = new Notification({
                    message: `💬 New chat recorded for ${userName}: "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"`,
                    type: 'chat'
                });
                await notification.save();
            } catch (notifErr) {
                console.error('Failed to create chat notification:', notifErr);
            }
        }

        // 3. Set Headers for Streaming (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send the active chatId to the client immediately
        res.write(`data: ${JSON.stringify({ chatId: chatDoc._id })}\n\n`);
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
                    // Split the text into words and spaces to stream in writing style
                    const tokens = chunkText.split(/(\s+)/);
                    for (const token of tokens) {
                        if (token) {
                            res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
                            fullResponse += token;
                            await sleep(30); // 30ms delay for a smooth word-by-word writing style
                        }
                    }
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
export default {
    chat
};