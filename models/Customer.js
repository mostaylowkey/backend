const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    stripeId: { type: String, required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Customer", customerSchema);
