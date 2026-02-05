const pool = require("../services/db");

module.exports.insertSingle = (data, callback) =>
{
    const SQLSTATMENT = `
    INSERT INTO wellnesschallenge (description,creator_id,points)
    VALUES (?, ?, ?);
    `;
const VALUES = [data.description, data.user_id,data.points];

pool.query(SQLSTATMENT, VALUES, callback);
}
// Return challenge list with aggregate review stats.
module.exports.selectAll = (callback) =>
{
    const SQLSTATMENT = `
    SELECT wc.challenge_id,
      wc.creator_id,
      u.username AS creator_username,
      wc.description,
      wc.points,
      AVG(r.rating) AS avg_rating,
      COUNT(r.rating) AS review_count
    FROM wellnesschallenge wc
    JOIN User u ON u.user_id = wc.creator_id
    LEFT JOIN Review r ON r.challenge_id = wc.challenge_id
    GROUP BY wc.challenge_id, wc.creator_id, u.username, wc.description, wc.points;
    `;

    pool.query(SQLSTATMENT, callback);
}
// Return a single challenge with aggregate review stats.
module.exports.selectById = (data, callback) =>
{
    const SQLSTATMENT = `
    SELECT wc.challenge_id,
      wc.creator_id,
      u.username AS creator_username,
      wc.description,
      wc.points,
      AVG(r.rating) AS avg_rating,
      COUNT(r.rating) AS review_count
    FROM wellnesschallenge wc
    JOIN User u ON u.user_id = wc.creator_id
    LEFT JOIN Review r ON r.challenge_id = wc.challenge_id
    WHERE wc.challenge_id = ?
    GROUP BY wc.challenge_id, wc.creator_id, u.username, wc.description, wc.points;
    `;
    const VALUES = [data.id];

    pool.query(SQLSTATMENT, VALUES, callback);
}

    
module.exports.deleteById = (data, callback) =>
{
    const SQLSTATMENT = `
    DELETE FROM wellnesschallenge
    WHERE challenge_id  = ?;
    `;
const VALUES = [data.id];

pool.query(SQLSTATMENT, VALUES, callback);
}
module.exports.updateById = (data, callback) =>
{
    const SQLSTATMENT = `
    UPDATE wellnesschallenge 
    SET  points = ? , description =?
    WHERE challenge_id = ?;
    `;
const VALUES = [data.points, data.description, data.id];

pool.query(SQLSTATMENT, VALUES, callback);
}

module.exports.deleteByUserId = (data, callback) =>
{
    const SQLSTATMENT = `
    DELETE FROM usercompletion
    WHERE challenge_id  = ?;
    `;
const VALUES = [data.id];
pool.query(SQLSTATMENT, VALUES, callback);
}
module.exports.createChallenge = (data, callback) =>
{
    const SQLSTATMENT = `
    INSERT INTO wellnesschallenge (creator_id, description, points)
    VALUES (?, ?, ?);
    `;
    const VALUES = [data.user_id, data.description, data.points];

    pool.query(SQLSTATMENT, VALUES, callback);
}

// Latest challenge creation time for cooldown enforcement.
module.exports.selectCreateCooldownByUserId = (data, callback) => {
    const SQLSTATMENT = `
    SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_since
    FROM wellnesschallenge
    WHERE creator_id = ?
    ORDER BY created_at DESC
    LIMIT 1;
    `;
    const VALUES = [data.user_id];
    pool.query(SQLSTATMENT, VALUES, callback);
}

// Daily limit for challenge creation.
module.exports.countCreatedTodayByUserId = (data, callback) => {
    const SQLSTATMENT = `
    SELECT COUNT(*) AS challenge_count
    FROM wellnesschallenge
    WHERE creator_id = ?
      AND DATE(created_at) = CURDATE();
    `;
    const VALUES = [data.user_id];
    pool.query(SQLSTATMENT, VALUES, callback);
}

