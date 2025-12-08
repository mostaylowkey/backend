const express = require("express");
const router = express.Router();

const transporter = require("../mail/transporter");

router.post("/", async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "All fields required." });
    }

    try {
        await transporter.sendMail({
            from: email,
            to: "support@592panel.me",  // <-- change to your business inbox
            subject: `[Support] ${subject}`,
            text: `
Name: ${name}
Email: ${email}

Message:
${message}
            `
        });

        res.json({ success: true });

    } catch (error) {
        console.error("EMAIL FAILED:", error);
        res.status(500).json({ error: "Email could not be sent." });
    }
});

module.exports = router;
