const bossModel = require("../models/bossModel");

module.exports.getActiveBoss = (req, res) => {
  bossModel.selectActiveBoss((err, boss) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!boss) {
      // optional: if no boss exists
      return res.status(404).json({ message: "No active boss found" });
    }

    return res.status(200).json(boss);
  });
};

module.exports.getBossLeaderboard = (req, res) => {
  bossModel.selectBossLeaderboard((err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });

    return res.status(200).json(rows);
  });
};

