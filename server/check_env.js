const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Checking Server Environment Configuration...');

const config = {
    PORT: process.env.PORT,
    CLIENT_URL: process.env.CLIENT_URL,
    MONGO_URI: process.env.MONGO_URI ? 'SET (Hidden)' : 'NOT SET',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET (Hidden)' : 'NOT SET',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? 'SET (Hidden)' : 'NOT SET'
};

console.table(config);

if (!process.env.PORT) {
    console.error('❌ PORT is missing from .env');
    process.exit(1);
}
if (!process.env.CLIENT_URL) {
    console.error('❌ CLIENT_URL is missing from .env');
    process.exit(1);
}

console.log('✅ Server environment configuration appears correct.');
