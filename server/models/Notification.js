import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    type: { type: String, enum: ['signup', 'chat'], required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', NotificationSchema);
