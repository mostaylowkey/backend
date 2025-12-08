const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

// Rate limit to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 5,
    message: { error: "Too many attempts. Try again shortly." }
});

// Helper to validate names
function validateFullName(name) {
    if (!name) return false;
    const parts = name.trim().split(" ");
    if (parts.length < 2) return false;
    if (parts[0].length < 2 || parts[1].length < 2) return false;
    return true;
}

// Create JWT
const createToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            username: user.username,
            name: user.name,
            address: user.address
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

/* ============================================================
   SIGNUP — WITH VALIDATION
============================================================ */
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        if (!validateFullName(name)) {
            return res.status(400).json({ error: "Please enter first & last name (min 2 letters each)" });
        }

        if (!username || username.length < 3) {
            return res.status(400).json({ error: "Username must be at least 3 characters" });
        }

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ error: "Email already in use" });

        const user = await User.create({ username, email, password, name, address: "" });

        const token = createToken(user);

        res.status(201).json({
            success: true,
            message: "Account created",
            token,
        });

    } catch (err) {
        console.error("SIGNUP ERROR:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/* ============================================================
   LOGIN — RATE-LIMITED
============================================================ */
router.post("/login", loginLimiter, async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        if (!emailOrUsername || !password)
            return res.status(400).json({ error: "Missing fields" });

        const user = await User.findOne({
            $or: [
                { email: emailOrUsername },
                { username: emailOrUsername }
            ]
        });

        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect password" });

        const token = createToken(user);

        res.json({
            success: true,
            token,
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/* ============================================================
   GET USER DATA
============================================================ */
router.get("/me", authMiddleware, (req, res) => {
    res.json(req.user);
});

/* ============================================================
   UPDATE PROFILE (name + username + address)
============================================================ */
router.put("/update-profile", authMiddleware, async (req, res) => {
    try {
        const { username, name, address } = req.body;

        if (!validateFullName(name)) {
            return res.status(400).json({ error: "Full name required (first & last)" });
        }

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { username, name, address },
            { new: true }
        ).select("-password");

        res.json({ success: true, user: updated });

    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================================
   CHANGE PASSWORD — secure
============================================================ */
router.put("/change-password", authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "All fields required" });
        }

        const user = await User.findById(req.user._id);

        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ error: "Old password incorrect" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be 8+ characters" });
        }

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: "Password updated" });

    } catch (err) {
        console.error("PASS CHANGE ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================================
   DELETE ACCOUNT
============================================================ */
router.delete("/delete", authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;

