import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import User from '../models/User.js';
import Notification from '../models/Notification.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/auth/google
// @desc    Auth with Google
// @access  Public
router.get('/google', (req, res, next) => {
    const mode = req.query.mode || 'login';
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: mode
    })(req, res, next);
});

// @route   GET api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=Server error`);
        if (!user) {
            const message = info ? info.msg : 'Authentication failed';
            return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=${encodeURIComponent(message)}`);
        }

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 259200 }, (err, token) => {
            if (err) throw err;
            const userData = { id: user.id, name: user.name, email: user.email, role: user.role };
            res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`);
        });
    })(req, res, next);
});

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    // Password validation: min 8 chars, at least 1 special char
    const passwordRegex = /^(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ msg: 'Password must be at least 8 characters long and contain at least one special character (!@#$%^&*).' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        user = new User({ name: `${firstName} ${lastName}`, email, password });
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 259200 }, async (err, token) => {
            if (err) throw err;

            // Create admin notification
            try {
                const notification = new Notification({
                    message: `👤 New user registered: ${user.name} (${user.email})`,
                    type: 'signup'
                });
                await notification.save();
            } catch (notifErr) {
                console.error('Failed to create signup notification:', notifErr);
            }

            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 259200 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/auth/users
// @desc    Get all registered users (Admin only)
// @access  Private/Admin
router.get('/users', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        const users = await User.find().select('-password').sort({ name: 1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   PATCH api/auth/users/:id/role
// @desc    Change a user's role (Admin only)
// @access  Private/Admin
router.patch('/users/:id/role', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        if (req.params.id === req.user.id) {
            return res.status(400).json({ msg: 'You cannot change your own role' });
        }
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ msg: 'Invalid role. Must be "user" or "admin"' });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   DELETE api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private/Admin
router.delete('/users/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        if (req.params.id === req.user.id) {
            return res.status(400).json({ msg: 'You cannot delete your own account' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   GET api/auth/notifications
// @desc    Get recent admin notifications (Admin only)
// @access  Private/Admin
router.get('/notifications', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/auth/notifications/read
// @desc    Mark all admin notifications as read (Admin only)
// @access  Private/Admin
router.post('/notifications/read', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        await Notification.updateMany({ read: false }, { $set: { read: true } });
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/auth/notifications/:id/read
// @desc    Mark a single notification as read (Admin only)
// @access  Private/Admin
router.post('/notifications/:id/read', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admins only' });
        }
        await Notification.findByIdAndUpdate(req.params.id, { $set: { read: true } });
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

export default router;