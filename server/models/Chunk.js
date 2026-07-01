import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
    docId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    text: { type: String, required: true },
    metadata: { type: Map, of: String }, // e.g., page number
    embedding: { type: [Number], required: true }, // Vector for MongoDB Atlas Search
    createdAt: { type: Date, default: Date.now }
});

// Note: To make vector search work, you MUST create a Search Index named 'vector_index' 
// on the 'chunks' collection in MongoDB Atlas with the following JSON configuration:
// {
//   "fields": [
//     {
//       "numDimensions": 3072,
//       "path": "embedding",
//       "similarity": "cosine",
//       "type": "vector"
//     }
//   ]
// }

export default mongoose.model('Chunk', ChunkSchema);