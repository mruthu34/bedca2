const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const getInventoryChain = [
  jwtMiddleware.verifyToken,
  inventoryController.getInventory
];

const useItemChain = [
  jwtMiddleware.verifyToken,
  inventoryController.useItem
];

// GET /inventory
router.get("/", getInventoryChain);
// POST /inventory/use
router.post("/use", useItemChain);

module.exports = router;
