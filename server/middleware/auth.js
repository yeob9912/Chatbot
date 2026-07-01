import { auth } from "google-auth-library";
import jwt from "jsonwebtoken";

const authMiddleware = function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.split(' ')[1] || req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export { auth };
export default authMiddleware;