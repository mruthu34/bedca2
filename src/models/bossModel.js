const pool = require("../services/db");

// Get active boss
// Active boss is the latest row with is_active=1.
module.exports.selectActiveBoss = (callback) => {
  const SQL = `
    SELECT boss_id, name, max_hp, current_hp
    FROM Boss
    WHERE is_active = 1
    ORDER BY boss_id DESC
    LIMIT 1;
  `;

  pool.query(SQL, (err, results) => {
    if (err) return callback(err, null);
    if (results.length === 0) return callback(null, null);
    return callback(null, results[0]);
  });
};

// Leaderboard: total damage per user (join User for username)
// Aggregate total damage by user for leaderboard display.
module.exports.selectBossLeaderboard = (callback) => {
  const SQL = `
    SELECT u.user_id, u.username, SUM(bdl.damage) AS total_damage
    FROM BossDamageLog bdl
    JOIN User u ON u.user_id = bdl.user_id
    GROUP BY u.user_id, u.username
    ORDER BY total_damage DESC;
  `;

  pool.query(SQL, (err, results) => {
    if (err) return callback(err, null);
    return callback(null, results);
  });
};
module.exports.insertDamageLog = (boss_id, user_id, completion_id, damage, points_spent, callback) => {
  const SQL = `
    INSERT INTO BossDamageLog (boss_id, user_id, completion_id, damage, points_spent)
    VALUES (?, ?, ?, ?, ?);
  `;
  pool.query(SQL, [boss_id, user_id, completion_id, damage, points_spent], callback);
};



// Only deactivate if HP has reached exactly 0 to avoid race issues.
module.exports.deactivateBossIfDead = (boss_id, callback) => {
  const SQL = `
    UPDATE Boss
    SET is_active = 0
    WHERE boss_id = ? AND current_hp = 0 AND is_active = 1;
  `;
  pool.query(SQL, [boss_id], callback);
};

// Spawn a new active boss at full HP.
module.exports.spawnBoss = (name, max_hp, callback) => {
  const SQL = `
    INSERT INTO Boss (name, max_hp, current_hp, is_active)
    VALUES (?, ?, ?, 1);
  `;
  pool.query(SQL, [name, max_hp, max_hp], callback);
};
// Reduce HP but clamp at 0 to avoid negative values.
module.exports.updateBossHp = (boss_id, damage, callback) => {
  const SQL = `
    UPDATE Boss
    SET current_hp = GREATEST(current_hp - ?, 0)
    WHERE boss_id = ?;
  `;
  pool.query(SQL, [damage, boss_id], callback);
};
