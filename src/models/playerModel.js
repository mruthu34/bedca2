const pool = require("../services/db");

module.exports.deletePlayer = (data, callback) =>
{
    const SQLSTATEMENT = `
        DELETE FROM Player
        WHERE id = ?;

        ALTER TABLE Player AUTO_INCREMENT = 1;
        `;
    const VALUES = [data.player_id];

    pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.insertPlayerUserRelationship = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO Playeruserrel (player_id, user_id)
    VALUES (?, ?)
  `;
  const VALUES = [data.player_id, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.insertSingle = (data, callback) =>
{
    const SQLSTATMENT = `
    INSERT INTO Player (name, level)
    VALUES (?, ?);
    `;
    const VALUES = [data.name, data.level];

    pool.query(SQLSTATMENT, VALUES, callback);
};

module.exports.updateById = (data, callback) =>
{
    const SQLSTATMENT = `
    UPDATE Player 
    SET name = ?, level = ?
    WHERE id = ?;
    `;
    const VALUES = [data.name, data.level, data.id];

    pool.query(SQLSTATMENT, VALUES, callback);
};
