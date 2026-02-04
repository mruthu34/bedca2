const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const buyItemChain = [
  jwtMiddleware.verifyToken,
  shopController.buyItem
];
const buyCapacityChain = [
  jwtMiddleware.verifyToken,
  shopController.buyCapacity
];

// GET /shop/items
router.get("/items", shopController.listItems);

// POST /shop/buy
router.post("/buy", buyItemChain);
// POST /shop/buy-capacity
router.post("/buy-capacity", buyCapacityChain);

module.exports = router;
