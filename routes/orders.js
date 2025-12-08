const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to verify JWT (same as your auth-protected routes)
const verifyToken = require("../middleware/verifyToken");

// Get all active/pending orders
router.get("/active", verifyToken, async (req, res) => {
    try {
        const sessions = await stripe.checkout.sessions.list({
            limit: 50,
        });

        // Filter sessions for ones that are not completed, expired, or canceled
        const activeSessions = sessions.data.filter(s =>
            s.status === "open" || s.status === "pending"
        );

        if (activeSessions.length === 0) {
            return res.json({ activeOrders: [], message: "No active orders." });
        }

        res.json({ activeOrders: activeSessions });
    } catch (error) {
        console.error("Stripe error:", error);
        res.status(500).json({ error: "Failed to fetch active orders." });
    }
});

module.exports = router;
