const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

// GET /inventory (requires auth)
router.get("/", jwtMiddleware.verifyToken, inventoryController.getInventory);
// POST /inventory/use (requires auth)
router.post("/use", jwtMiddleware.verifyToken, inventoryController.useItem);

module.exports = router;
