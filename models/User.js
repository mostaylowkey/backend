const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    // REQUIRED fields
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // NEW FIELDS FOR SECURITY + SETTINGS
    name: { type: String, required: true },    // Full name (first + last)
    address: { type: String, default: "" },    // Street address
    state: { type: String, default: "" },      // State selection

    createdAt: { type: Date, default: Date.now }
});

// Hash password before save (modern async hook)
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare entered password to hashed password
userSchema.methods.matchPassword = function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
