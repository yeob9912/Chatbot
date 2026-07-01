import '../loadEnv.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import Notification from '../models/Notification.js';


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    proxy: true,
    passReqToCallback: true
},
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const mode = req.query.state || 'login';

            let user = await User.findOne({ googleId: profile.id });
            if (user) return done(null, user);

            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            }

            // User not found - automatically sign up the user
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id
            });
            await user.save();

            // Create admin notification
            try {
                const notification = new Notification({
                    message: `👤 New user registered (Google): ${user.name} (${user.email})`,
                    type: 'signup'
                });
                await notification.save();
            } catch (err) {
                console.error('Failed to save google signup notification:', err);
            }

            return done(null, user);
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));

export default passport;