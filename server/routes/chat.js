import express from 'express';
import chatController from '../controllers/chat.js';
import auth from '../middleware/auth.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// POST /api/chat - Send message (RAG + Stream) - Protected Access
router.post('/', auth, chatController.chat);

// @route   GET api/chat/history
// @desc    Get chat history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id, "messages.1": { $exists: true } }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/chat/:id
// @desc    Delete a specific chat history
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found' });
        }

        // Check user ownership
        if (chat.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await chat.deleteOne();

        res.json({ msg: 'Chat removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Chat not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET api/chat/all
// @desc    Get all chat logs with user details (Admin only)
// @access  Private/Admin
router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        const chats = await Chat.find({ "messages.1": { $exists: true } })
            .populate('userId', 'name email')
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

export default router;