const express = require("express");
const {
    createCheckoutSession,
    handleWebhooks
} = require("../controllers/paymentsController.js");

const router = express.Router();

router.post("/checkout", createCheckoutSession);
router.post("/webhook", handleWebhooks);

module.exports = router;
