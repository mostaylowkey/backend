const stripe = require("../stripe");
const mongoose = require("mongoose");


const activeProductSchema = new mongoose.Schema({
    stripeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    images: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
}, { collection: "inv" });

// Prevent OverwriteModelError
const InvProduct = mongoose.models.inv || mongoose.model("inv", activeProductSchema);

const createActiveInventory = async () => {
    try {
        const stripeProducts = await stripe.products.list({ limit: 100, active: true });
        const prices = await stripe.prices.list({ limit: 100 });

        await InvProduct.deleteMany({});

        for (const product of stripeProducts.data) {
            const price = prices.data.find(p => p.product === product.id);
            await InvProduct.create({
                stripeId: product.id,
                name: product.name,
                description: product.description,
                price: price ? price.unit_amount : 0,
                currency: price ? price.currency : "usd",
                images: product.images || [],
            });
        }

        console.log("Active products saved in 'inv' collection!");
    } catch (err) {
        console.error("Error creating inv collection:", err);
    }
};

module.exports = { createActiveInventory, InvProduct };
