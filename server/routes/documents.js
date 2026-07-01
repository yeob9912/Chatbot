import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import documentsController from '../controllers/documents.js';

const router = express.Router();

// Multer Config
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log(`Checking file type: "${file.mimetype}" for "${file.originalname}"`);
        if (file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/x-pdf' ||
            file.mimetype === 'text/plain' ||
            file.originalname.toLowerCase().endsWith('.pdf') ||
            file.originalname.toLowerCase().endsWith('.txt')) {
            cb(null, true);
        } else {
            console.error(`Rejected file: ${file.originalname} (Mime: ${file.mimetype})`);
            cb(new Error(`Only PDF and Text files are allowed! (Found: ${file.mimetype})`), false);
        }
    }
});

// Routes
router.post('/upload', auth, upload.single('file'), documentsController.uploadFile);
router.post('/url', auth, documentsController.addUrl);
router.post('/text', auth, documentsController.addText);
router.get('/', auth, documentsController.getDocuments);
router.delete('/:id', auth, documentsController.deleteDocument);

export default router;