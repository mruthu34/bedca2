const express = require("express");
const router = express.Router();

const bossController = require("../controllers/bossController");
const completionController = require("../controllers/completionController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

// GET /boss
router.get("/", bossController.getActiveBoss);

// GET /boss/leaderboard
router.get("/leaderboard", bossController.getBossLeaderboard);

// POST /boss/hit (requires auth)
router.post("/hit", jwtMiddleware.verifyToken, completionController.hitBoss);

module.exports = router;
