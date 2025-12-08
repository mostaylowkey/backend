const express = require("express");
const router = express.Router();
const { InvProduct } = require("../utils/inv.js"); // import the model

router.get("/", async (req, res) => {
    try {
        const products = await InvProduct.find({});
        res.json(products);
    } catch (err) {
        console.error("Error fetching products from inv:", err);
        res.status(500).json({ error: "Failed to fetch products from inv collection" });
    }
});

module.exports = router;
