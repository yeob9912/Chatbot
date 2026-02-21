const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { generateAnswer } = require('./utils/rag');

async function verifyLocalLogic() {
    console.log("--- Testing Local Logic ---");

    const testCases = [
        "hy",
        "good morning",
        "Thank you",
        "thx",
        "Who is ASTU?" // This should fall through (need to mock chunks)
    ];

    for (const query of testCases) {
        console.log(`\nQuery: "${query}"`);
        try {
            const stream = await generateAnswer(query, query === "Who is ASTU?" ? [{ text: "ASTU is a university." }] : []);

            let fullText = "";
            for await (const chunk of stream) {
                const text = chunk.text();
                if (text) {
                    process.stdout.write(text);
                    fullText += text;
                }
            }
            console.log(`\nFull Response: "${fullText}"`);
        } catch (err) {
            console.error(`Error for ${query}:`, err.message);
        }
    }
}

verifyLocalLogic();
