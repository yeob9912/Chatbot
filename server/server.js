import './loadEnv.js';
import express from 'express';
import passport from 'passport';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Import local configuration and routes
import './config/passport.js';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';

// Add global error handlers
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
});

const app = express();

// Connect Database
connectDB();

// Init Passport
app.use(passport.initialize());

// Init Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debugging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: `ASTU Helper Backend is running on port ${process.env.PORT}!`
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

// Catch-all for 404s
app.use((req, res) => {
    res.status(404).json({ msg: `Route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ GLOBAL ERROR:', err);
    res.status(500).json({ msg: 'Global Server Error', error: err.message });
});

if (!process.env.PORT) {
    console.error("❌ FATAL ERROR: PORT is not defined in .env");
    process.exit(1);
}
const PORT = process.env.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 ============================================');
    console.log(`🚀 ASTU BACKEND STARTED SUCCESSFULLY`);
    console.log(`🚀 PORT: ${PORT}`);
    console.log(`🚀 API: http://127.0.0.1:${PORT}/api`);
    console.log('🚀 ============================================');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ FATAL ERROR: Port ${PORT} is already in use.`);
        console.log(`Please run: Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
        process.exit(1);
    } else {
        console.error('❌ SERVER ERROR:', err);
    }
});