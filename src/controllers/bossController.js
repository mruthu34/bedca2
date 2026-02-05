const bossModel = require("../models/bossModel");

// Returns the currently active boss (highest active boss_id).
module.exports.getActiveBoss = (req, res, next) => {
  bossModel.selectActiveBoss((err, boss) => onGetActiveBoss(err, boss, req, res, next));
};

// Returns cumulative damage per user across all bosses.
module.exports.getBossLeaderboard = (req, res, next) => {
  bossModel.selectBossLeaderboard((err, rows) => onGetBossLeaderboard(err, rows, req, res, next));
};

const onGetActiveBoss = (err, boss, req, res, next) => {
  if (err) {
    console.error("Error getActiveBoss:", err);
    return next(err);
  }

  if (!boss) {
    return res.status(404).json({ message: "No active boss found" });
  }

  return res.status(200).json(boss);
};

const onGetBossLeaderboard = (err, rows, req, res, next) => {
  if (err) {
    console.error("Error getBossLeaderboard:", err);
    return next(err);
  }

  return res.status(200).json(rows);
};

