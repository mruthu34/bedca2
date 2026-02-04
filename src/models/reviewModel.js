const pool = require("../services/db");

module.exports.selectByChallengeId = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT r.review_id, r.challenge_id, r.user_id, u.username, r.rating, r.comment, r.created_at
    FROM Review r
    JOIN User u ON u.user_id = r.user_id
    WHERE r.challenge_id = ?
    ORDER BY r.created_at DESC;
  `;
  const VALUES = [data.challenge_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectByChallengeAndUser = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT review_id
    FROM Review
    WHERE challenge_id = ? AND user_id = ?;
  `;
  const VALUES = [data.challenge_id, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.insertSingle = (data, callback) => { 
  const SQLSTATEMENT = `
    INSERT INTO Review (challenge_id, user_id, rating, comment)
    VALUES (?, ?, ?, ?);
  `;
  const VALUES = [data.challenge_id, data.user_id, data.rating, data.comment || null];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.updateByChallengeAndUser = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE Review
    SET rating = ?, comment = ?
    WHERE challenge_id = ? AND user_id = ?;
  `;
  const VALUES = [data.rating, data.comment || null, data.challenge_id, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
