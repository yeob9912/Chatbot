const http = require('http');

const testQueries = [
    "Who is the president of USA?", // Should trigger "i have no information about the thing you asked me !"
    "What is ASTU?" // Should use context if available
];

const runTest = async (query) => {
    console.log(`\nTesting Query: "${query}"`);
    return new Promise((resolve) => {
        const postData = JSON.stringify({ query });
        const options = {
            hostname: 'localhost',
            port: 5138,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let fullText = "";
            res.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            fullText += parsed.text;
                        } catch (e) { }
                    }
                }
            });
            res.on('end', () => {
                console.log(`Final Response: "${fullText.trim()}"`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            resolve();
        });

        req.write(postData);
        req.end();
    });
};

async function main() {
    console.log("Starting final verification...");
    for (const q of testQueries) {
        await runTest(q);
    }
}

main();
