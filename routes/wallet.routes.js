const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth.middleware");

/* ================= GET WALLET BALANCE ================= */
router.get("/balance", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT coins FROM user_wallets WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      coins: result.rows[0]?.coins || 0
    });
  } catch (err) {
    console.error("Wallet balance error:", err);
    res.status(500).json({ error: "Failed to load wallet" });
  }
});

/* ================= GET WALLET TRANSACTIONS ================= */
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT type, amount, reference_id, created_at
      FROM coin_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      transactions: result.rows
    });
  } catch (err) {
    console.error("Wallet transactions error:", err);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

router.get("/streak", verifyToken, async (req, res) => {
  const user = await pool.query(
    `SELECT streak_count FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json({ streak: user.rows[0].streak_count });
});

router.post("/reward-course", verifyToken, async (req, res) => {
  try {

    const userId = req.user.id;
    const { course_id } = req.body;

    await pool.query(`
      UPDATE user_wallets
      SET coins = coins + 50
      WHERE user_id = $1
    `, [userId]);

    await pool.query(`
      INSERT INTO coin_transactions
      (user_id, type, amount, reference_id)
      VALUES ($1,'course_complete',50,$2)
    `, [userId, course_id]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Reward failed" });
  }
});

router.get("/store-items", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id,title,description,coin_cost,item_type
      FROM coin_store_items
      WHERE is_active = true
      ORDER BY coin_cost ASC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load store" });
  }
});

router.post("/buy", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_id } = req.body;

    const itemRes = await pool.query(
      `SELECT * FROM coin_store_items WHERE id=$1 AND is_active=true`,
      [item_id]
    );

    if (!itemRes.rows.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    const item = itemRes.rows[0];

    const wallet = await pool.query(
      `SELECT coins FROM user_wallets WHERE user_id=$1`,
      [userId]
    );

    const coins = wallet.rows[0]?.coins || 0;

    if (coins < item.coin_cost) {
      return res.status(400).json({ error: "Not enough coins" });
    }

    await pool.query(
      `UPDATE user_wallets SET coins = coins - $1 WHERE user_id = $2`,
      [item.coin_cost, userId]
    );

    await pool.query(
      `INSERT INTO coin_transactions (user_id,type,amount,reference_id)
       VALUES ($1,'purchase',$2,$3)`,
      [userId, -item.coin_cost, item.id]
    );

    res.json({ success: true, item });

  } catch (err) {
    res.status(500).json({ error: "Purchase failed" });
  }
});

router.post("/buy-coins", verifyToken, async (req,res)=>{
  return res.status(400).json({
    error: "Payment gateway not connected yet"
  });
});

module.exports = router;
