const pool = require("../services/db");

// Keep only one active effect per user (insert or update).
module.exports.upsertEffect = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO UserEffect (user_id, bonus_damage, multiplier)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE bonus_damage = VALUES(bonus_damage),
    multiplier = VALUES(multiplier);
  `;
  const VALUES = [data.user_id, data.bonus_damage, data.multiplier];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT user_id, bonus_damage, multiplier
    FROM UserEffect
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.clearByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM UserEffect
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
