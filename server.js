// ===============================
//  Imports
// ===============================
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();

// ===============================
//  CORS CONFIGURATION
// ===============================
// Your production frontend
const allowedOrigins = [
    "https://592panel.me",       // LIVE frontend
    "http://localhost:8000",     // Local testing
    "http://localhost:3000",
    "http://169.254.83.107:8000"
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow non-browser tools, Postman, curl, Cloudflare Tunnel
        if (!origin) return callback(null, true);

        // Allow Bootstrap Studio preview dynamic origin (100.xxx.xxx.xxx:8000)
        if (origin.startsWith("http://100.")) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log("❌ BLOCKED ORIGIN:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
};

app.use(cors(corsOptions));

// Parse JSON normally
app.use(express.json());

// Stripe webhook needs raw body
app.use("/payments/webhook", express.raw({ type: "application/json" }));

// ===============================
//  API ROUTES ONLY
// ===============================
app.use("/auth", require("./routes/Auth"));
app.use("/orders", require("./routes/orders"));
app.use("/contact", require("./routes/contact"));
app.use("/products", require("./routes/products"));
app.use("/payments", require("./routes/payments"));
app.use("/connect", require("./routes/connect"));

// ===============================
//  DATABASE + INVENTORY
// ===============================
const connectDB = require("./utils/db");

connectDB().then(async () => {
    const { createActiveInventory } = require("./utils/inv");
    await createActiveInventory();
    console.log("💾 Inventory synced");
});

// ===============================
//  NO FRONTEND HOSTING HERE
//  API ONLY — DO NOT SERVE INDEX.HTML
// ===============================

// -------------------------------
//  HEALTH CHECK ENDPOINT
// -------------------------------
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
        domain: "api.592panel.me"
    });
});

// ===============================
//  START SERVER
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API Server running on port ${PORT}`);
});
