const express = require("express");
const router = express.Router();

const bossController = require("../controllers/bossController");
const completionController = require("../controllers/completionController");
const jwtMiddleware = require("../middleware/jwtMiddleware");

const attachUserFromToken = (req, res, next) => {
  req.user = { user_id: res.locals.userId };
  next();
};

const hitBossChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken,
  completionController.hitBoss
];

// GET /boss
router.get("/", bossController.getActiveBoss);

// GET /boss/leaderboard
router.get("/leaderboard", bossController.getBossLeaderboard);

// POST /boss/hit
router.post("/hit", hitBossChain);

module.exports = router;
