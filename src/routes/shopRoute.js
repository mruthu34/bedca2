const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const buyItemChain = [
  jwtMiddleware.verifyToken,
  shopController.buyItem
];

// GET /shop/items
router.get("/items", shopController.listItems);

// POST /shop/buy
router.post("/buy", buyItemChain);

module.exports = router;
