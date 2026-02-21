const { GoogleGenerativeAI } = require("@google/generative-ai");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const Chunk = require('../models/Chunk');

// Initialize Gemini - using GOOGLE_API_KEY as standardized
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper for retries
const withRetry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`⚠️ API call failed, retrying (${i + 1}/${retries})... Error: ${error.message}`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

const embedText = async (chunks, isAddingData = false) => {
    console.log(`Embedding text (count: ${Array.isArray(chunks) ? chunks.length : 1}, isAddingData: ${isAddingData})...`);
    try {
        // Using text-embedding-004 as it supports 3072 dimensions
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const textToEmbed = Array.isArray(chunks) ? chunks : [chunks];
        const taskType = isAddingData ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";

        const result = await withRetry(() => model.batchEmbedContents({
            requests: textToEmbed.map((text) => ({
                content: { role: "user", parts: [{ text }] },
                taskType: taskType,
            })),
            outputDimensionality: 3072, // User requested 3072 dimensions
        }));

        console.log(`Embedding generation successful.`);
        const embeddings = result.embeddings.map(e => e.values);
        return Array.isArray(chunks) ? embeddings : embeddings[0];
    } catch (error) {
        console.error("❌ Embedding error:", error.message);
        throw error;
    }
};

const chunkText = async (text) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const output = await splitter.createDocuments([text]);
    return output.map(doc => doc.pageContent);
};

const vectorSearch = async (queryText, limit = 5) => {
    console.log(`\n=== VECTOR SEARCH START ===`);
    console.log(`Query: "${queryText}"`);
    try {
        console.log(`Step 1: Generating query embedding...`);
        const queryVector = await embedText(queryText, false);
        console.log(`✅ Query embedding generated (${queryVector.length} dimensions)`);

        if (queryVector.length !== 3072) {
            console.error(`⚠️ DIMENSION MISMATCH: Expected 3072, but got ${queryVector.length}. Vector search will likely fail.`);
        }
        const agg = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 200,
                    limit: 15,
                },
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    score: { $meta: "vectorSearchScore" },
                },
            },
            {
                $match: {
                    score: { $gte: 0.05 }
                }
            }
        ];

        console.log(`Step 2: Executing MongoDB vector search on "chunks" collection...`);
        const results = await Chunk.aggregate(agg);
        console.log(`✅ Vector Search complete! Found ${results.length} chunks.`);
        if (results.length > 0) {
            console.log(`   Top match score: ${results[0].score.toFixed(4)}`);
        }
        console.log(`=== VECTOR SEARCH END ===\n`);
        return results;
    } catch (error) {
        console.error("❌ Vector Search error:", error.message);
        if (error.message.includes('index')) {
            console.error("⚠️  HINT: The 'vector_index' might be missing in MongoDB Atlas.");
        }
        console.log(`=== VECTOR SEARCH END (ERROR) ===\n`);
        return [];
    }
};

const generateAnswer = async (query, contextChunks) => {
    console.log(`Preparing to generate answer for: "${query}"`);

    const lowerQuery = query.toLowerCase().trim();

    // 1. Check for Greetings
    const greetings = /^(hi|hello|hey|greetings|hy|good\s*morning|good\s*afternoon|good\s*evening)$/i;
    const isGreeting = greetings.test(lowerQuery);

    if (isGreeting) {
        console.log(`Detected greeting, returning friendly response (local).`);
        const responseText = "Hello! How can I help you today?";
        return (async function* () {
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
                const text = words[i] + (i === words.length - 1 ? "" : " ");
                yield { text: () => text };
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        })();
    }

    // 2. Check for "Thank you"
    const thanks = /^(thank\s*you|thanks|thx|appreciate\s*it|thanku)$/i;
    const isThanks = thanks.test(lowerQuery);

    if (isThanks) {
        console.log(`Detected gratitude, returning friendly response (local).`);
        const responseText = "It’s my pleasure to help you!  Feel free to ask if you need anything else. 💬💖";
        return (async function* () {
            // Stream word by word for a more natural effect
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
                const text = words[i] + (i === words.length - 1 ? "" : " ");
                yield { text: () => text };
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        })();
    }

    if (contextChunks.length === 0) {
        console.log(`No context found, returning fallback immediately.`);
        const responseText = "i have no information about the thing you asked me !";
        return (async function* () {
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
                const text = words[i] + (i === words.length - 1 ? "" : " ");
                yield { text: () => text };
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        })();
    }

    const context = contextChunks.map(c => c.text).join("\n\n");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are ASTU Portal's Helper, an AI assistant for Adama Science and Technology University. 
Your primary goal is to provide information specifically based on the provided KNOWLEDGE BASE DATA.

KNOWLEDGE BASE DATA:
---
${context}
---

USER QUESTION: ${query}

STRICT INSTRUCTIONS:
1. Use ONLY the KNOWLEDGE BASE DATA to answer the user's question. 
2. If the answer is NOT present in the data, respond exactly with: "i have no information about the thing you asked me !"
3. If the user greets you (hi, hello, etc.), you can be friendly, but for any specific query, follow rule #2.
4. Keep your answer professional, accurate, and concise (MAX 2 LINES).
5. DO NOT mention that you are using provided data or a knowledge base. Just answer directly.
`;

    console.log(`Calling Gemini API (gemini-2.5-flash)...`);
    try {
        const result = await withRetry(() => model.generateContentStream(prompt));
        console.log(`Gemini API stream established. Converting to word-by-word...`);

        return (async function* () {
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    const words = text.split(' ');
                    for (let i = 0; i < words.length; i++) {
                        const toSend = words[i] + (i === words.length - 1 ? "" : " ");
                        yield { text: () => toSend };
                        // Balanced delay for AI responses: fast enough to feel responsive, slow enough to see the words
                        await new Promise(resolve => setTimeout(resolve, 30));
                    }
                }
            }
        })();
    } catch (err) {
        console.error("❌ Gemini Generation Error:", err.message);
        console.error("Full error:", err);
        throw err;
    }
};

module.exports = { embedText, chunkText, vectorSearch, generateAnswer };
