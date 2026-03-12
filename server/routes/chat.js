const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat');
const auth = require('../middleware/auth');

const Chat = require('../models/Chat');

// POST /api/chat - Send message (RAG + Stream) - Protected Access
router.post('/', auth, chatController.chat);

// @route   GET api/chat/history
// @desc    Get chat history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id }).sort({ updatedAt: -1 });
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


module.exports = router;
