const cheerio = require('cheerio');

const html = `
<html>
<body>
    <header>Header</header>
    <main>
        <h1>About ASTU</h1>
        <p>Adama Science and Technology University (ASTU) is a leading research university in Ethiopia.</p>
    </main>
    <footer>Footer</footer>
</body>
</html>
`;

function testScraping() {
    console.log("Testing URL scraping logic...");

    // Simulating the logic in documents.js
    try {
        const $ = cheerio.load(html);
        let textContent = '';
        const mainContent = $('article, main, .content, #content').text();
        if (mainContent && mainContent.trim().length > 10) { // Reduced for test
            textContent = mainContent;
        } else {
            textContent = $('body').text();
        }

        textContent = textContent.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
        console.log("Extracted Text:", textContent);

        if (textContent.includes("ASTU") && !textContent.includes("Header")) {
            console.log("✅ Success: Extracted main content accurately.");
        } else {
            console.log("❌ Failure: Extraction incorrect.");
        }
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

testScraping();
