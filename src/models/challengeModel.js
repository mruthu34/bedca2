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
module.exports.selectAll = (callback) =>
{
    const SQLSTATMENT = `
    SELECT * FROM wellnesschallenge;
    `;

    pool.query(SQLSTATMENT, callback);
}
module.exports.selectById = (data, callback) =>
{
    const SQLSTATMENT = `
    SELECT * FROM wellnesschallenge
    WHERE challenge_id = ?;
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

