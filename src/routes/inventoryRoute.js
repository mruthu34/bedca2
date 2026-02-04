const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

// GET /inventory
router.get("/", jwtMiddleware.verifyToken, inventoryController.getInventory);
// POST /inventory/use
router.post("/use", jwtMiddleware.verifyToken, inventoryController.useItem);

module.exports = router;
