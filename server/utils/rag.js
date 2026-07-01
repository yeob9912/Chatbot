import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import Chunk from "../models/Chunk.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const responsesPath = path.join(__dirname, "../config/responses.json");

let predefinedResponses = {};
try {
    predefinedResponses = JSON.parse(fs.readFileSync(responsesPath, "utf8"));
} catch (e) {
    console.error("Failed to load predefined responses:", e);
}

// Initialize Gemini
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

export const embedText = async (chunks, isAddingData = false) => {
    console.log(`Embedding text (count: ${Array.isArray(chunks) ? chunks.length : 1}, isAddingData: ${isAddingData})...`);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const textToEmbed = Array.isArray(chunks) ? chunks : [chunks];
        const taskType = isAddingData ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";

        const result = await withRetry(() => model.batchEmbedContents({
            requests: textToEmbed.map((text) => ({
                content: { role: "user", parts: [{ text }] },
                taskType: taskType,
            })),
            outputDimensionality: 3072,
        }));

        console.log(`Embedding generation successful.`);
        const embeddings = result.embeddings.map(e => e.values);
        return Array.isArray(chunks) ? embeddings : embeddings[0];
    } catch (error) {
        console.error("❌ Embedding error:", error.message);
        throw error;
    }
};

export const chunkText = async (text) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });
    const output = await splitter.createDocuments([text]);
    return output.map(doc => doc.pageContent);
};

export const vectorSearch = async (queryText, limit = 5) => {
    console.log(`\n=== VECTOR SEARCH START ===`);
    try {
        const queryVector = await embedText(queryText, false);
        const agg = [
            {
                $vectorSearch: {
                    index: "Ragvector",
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

        return await Chunk.aggregate(agg);
    } catch (error) {
        console.error("❌ Vector Search error:", error.message);
        return [];
    }
};

export const generateAnswer = async (query, contextChunks) => {
    const lowerQuery = query.toLowerCase().trim();
    
    // Simple response helper
    const streamResponse = async function* (text) {
        const words = text.split(' ');
        for (const word of words) {
            yield { text: () => word + " " };
            await new Promise(resolve => setTimeout(resolve, 30));
        }
    };

    // Check predefined responses from responses.json
    for (const [key, value] of Object.entries(predefinedResponses)) {
        if (lowerQuery === key || lowerQuery.includes(key)) {
            return streamResponse(value);
        }
    }

    if (/^(hi|hello|hey|greetings|hy)$/i.test(lowerQuery)) {
        return streamResponse("Hello! How can I help you today?");
    }

    if (contextChunks.length === 0) {
        return streamResponse("i have no information about the thing you asked me !");
    }

    const context = contextChunks.map(c => c.text).join("\n\n");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a helpful AI assistant.
Based ONLY on the retrieved knowledge below, answer the user's question directly, concisely, and in a natural, conversational tone.
Do NOT output or print the raw context blocks, and do NOT copy the entire context text word-for-word.

Perspective Rule: Always respond in the third-person perspective (e.g., use "he", "his", "him", "he is", or the person's name). Never answer in the first-person perspective ("I", "my", "me", "my name is"), even if the retrieved knowledge itself is written in the first person.

Length Constraint: Keep your response concise. The entire response MUST NOT exceed 4 lines of text.

Retrieved Knowledge:
"${context}"

Question:
"${query}"

If the answer is not present in the retrieved knowledge, respond EXACTLY with: "i have no information about the thing you asked me !"`;

    const result = await withRetry(() => model.generateContentStream(prompt));

    return (async function* () {
        for await (const chunk of result.stream) {
            yield { text: () => chunk.text() };
        }
    })();
};