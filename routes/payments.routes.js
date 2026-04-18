const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth.middleware");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================= CREATE ORDER ================= */
router.post("/create-theme-order", verifyToken, async (req, res) => {
  try {
    const { theme_code } = req.body;

    const themeRes = await pool.query(
      "SELECT * FROM resume_themes WHERE code=$1",
      [theme_code]
    );

    if (!themeRes.rows.length)
      return res.status(404).json({ error: "Theme not found" });

    const theme = themeRes.rows[0];

    const options = {
      amount: theme.price * 100, // paise
      currency: "INR",
      receipt: "theme_" + Date.now()
    };

    const order = await razorpay.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount
    });

  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* ================= VERIFY PAYMENT ================= */
router.post("/verify-payment", verifyToken, async (req, res) => {
  try {

    console.log("VERIFY PAYMENT HIT");

    const userId = req.user.id;
    const { theme_code } = req.body;

    await pool.query(
      `INSERT INTO theme_purchases (user_id, theme_code)
       VALUES ($1, $2)
       ON CONFLICT (user_id, theme_code)
       DO NOTHING`,
      [userId, theme_code]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Verify failed:", err);
    res.status(500).json({ success: false });
  }
});

router.post("/create-coin-order", verifyToken, async (req, res) => {
  try {
    const { pack } = req.body;

    const packs = {
      starter: { amount: 4900, coins: 250 },
      popular: { amount: 9900, coins: 600 },
      pro: { amount: 19900, coins: 1400 }
    };

    if (!packs[pack]) {
      return res.status(400).json({ error: "Invalid pack" });
    }

    const order = await razorpay.orders.create({
      amount: packs[pack].amount,
      currency: "INR",
      receipt: "coins_" + Date.now()
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      coins: packs[pack].coins
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

module.exports = router;
