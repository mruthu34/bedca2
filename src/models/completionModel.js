const pool = require("../services/db");

module.exports.selectById = (data, callback) => {
  const SQLSTATMENT = `
    SELECT uc.user_id, u.username AS user_username, uc.details
    FROM usercompletion uc
    JOIN User u ON u.user_id = uc.user_id
    WHERE uc.challenge_id = ?;
    `;
  const VALUES = [data.challenge_id];

  pool.query(SQLSTATMENT, VALUES, callback);
};  

module.exports.existsByChallengeAndUser = (data, callback) => {
  const SQLSTATMENT = `
    SELECT completion_id
    FROM usercompletion
    WHERE challenge_id = ? AND user_id = ?
    LIMIT 1;
  `;
  const VALUES = [data.challenge_id, data.user_id];
  pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.deleteByChallengeId = (data, callback) =>
{
    const SQLSTATMENT = `
    DELETE FROM usercompletion
    WHERE challenge_id  = ?;
    `;
const VALUES = [data.challenge_id];
pool.query(SQLSTATMENT, VALUES, callback);

}

module.exports.insertSingle = (data, callback) =>
{
    const SQLSTATMENT = `
    INSERT INTO usercompletion (challenge_id,user_id,details)
    VALUES (?, ?,? );
    `;
const VALUES = [data.challenge_id,data.user_id,data.details];

pool.query(SQLSTATMENT, VALUES, callback);
}

module.exports.selectCooldownByChallengeAndUser = (data, callback) => {
  const SQLSTATMENT = `
    SELECT TIMESTAMPDIFF(SECOND, completed_at, NOW()) AS seconds_since
    FROM usercompletion
    WHERE challenge_id = ? AND user_id = ?
    ORDER BY completed_at DESC
    LIMIT 1;
  `;
  const VALUES = [data.challenge_id, data.user_id];
  pool.query(SQLSTATMENT, VALUES, callback);
};


