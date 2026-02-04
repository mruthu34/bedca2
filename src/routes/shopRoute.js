const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

// GET /shop/items
router.get("/items", shopController.listItems);

// POST /shop/buy
router.post("/buy", jwtMiddleware.verifyToken, shopController.buyItem);
// POST /shop/buy-capacity
router.post("/buy-capacity", jwtMiddleware.verifyToken, shopController.buyCapacity);

module.exports = router;
