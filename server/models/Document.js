import mongoose from "mongoose";
const DocumentSchema = new mongoose.Schema({
    filename: String,
    contentType: { type: String, enum: ['pdf', 'txt', 'md', 'url'] },
    uploadDate: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['processing', 'indexed', 'failed'], default: 'processing' },
    filePath: String, // Or URL
    size: Number
});

export default mongoose.model('Document', DocumentSchema);