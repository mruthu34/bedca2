const pool = require("../services/db");

module.exports.selectById = (data, callback) => {
  const SQLSTATMENT = `
    SELECT * FROM usercompletion
    WHERE challenge_id = ?;
    `;
  const VALUES = [data.challenge_id];

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


