const jwt = require("jsonwebtoken");

module.exports = function verifyToken(req, res, next) {
    // Check for Authorization header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ error: "No authorization header provided." });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Missing token." });
    }

    try {
        // Verify token with your JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded user info to request object
        req.user = decoded;

        next();
    } catch (err) {
        console.error("JWT ERROR:", err.message);
        return res.status(403).json({ error: "Invalid or expired token." });
    }
};
