const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    stripePaymentId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    items: [
        {
            productId: { type: String, required: true },
            quantity: { type: Number, default: 1 },
        }
    ],
    total: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: { type: String, default: "pending" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
