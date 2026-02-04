
const pool = require("../services/db");

module.exports.insertSingle = (data, callback) =>
{
    const SQLSTATMENT = `
    INSERT INTO User (username)
    VALUES (?);
    `;
    const VALUES = [data.username];

    pool.query(SQLSTATMENT, VALUES, callback);
}
module.exports.selectAll = (callback) =>
{
    const SQLSTATMENT = `
    SELECT * FROM User;
    `;
 
    pool.query(SQLSTATMENT, callback);
}
module.exports.selectById = (data, callback) =>
{
    const SQLSTATMENT = `
    SELECT * FROM User
    WHERE user_id = ?;
    `;
    const VALUES = [data.user_id];

    pool.query(SQLSTATMENT, VALUES, callback);
}
module.exports.updateById = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE User
    SET username = ? , points = ?
    WHERE user_id = ?;
  `;
  const VALUES = [data.username, data.points,data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
module.exports.addPoints = (data, callback) =>
{
    const SQLSTATMENT = `
    UPDATE User
    SET points = points + ?
    WHERE user_id = ?;
    `;
    const VALUES = [data.points, data.user_id];

    pool.query(SQLSTATMENT, VALUES, callback);
}

module.exports.deductPointsIfEnough = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE User
    SET points = points - ?
    WHERE user_id = ? AND points >= ?;
  `;
  const VALUES = [data.points, data.user_id, data.points];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectProfileStats = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT
      u.user_id,
      u.username,
      u.points,
      u.inventory_capacity,
      COALESCE(SUM(bdl.damage), 0) AS total_damage,
      COALESCE(SUM(bdl.points_spent), 0) AS total_points_spent
    FROM User u
    LEFT JOIN BossDamageLog bdl ON bdl.user_id = u.user_id
    WHERE u.user_id = ?
    GROUP BY u.user_id, u.username, u.points, u.inventory_capacity;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.increaseInventoryCapacity = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE User
    SET inventory_capacity = inventory_capacity + ?
    WHERE user_id = ?;
  `;
  const VALUES = [data.slots, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.deleteById = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM User
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
//////////////////////////////////////////////////////
// MODEL FOR LOGIN
//////////////////////////////////////////////////////
module.exports.login = (data, callback) => {

    const SQLSTATEMENT = `
        SELECT *
        FROM User
        WHERE username = ?;
    `;

    const VALUES = [data.username];

    pool.query(SQLSTATEMENT, VALUES, callback);
};


//////////////////////////////////////////////////////
// MODEL FOR REGISTER
//////////////////////////////////////////////////////
module.exports.readUserByEmailAndUsername = (data, callback) => {

    const SQLSTATEMENT = `
        SELECT User.email
        FROM User
        WHERE email = ?;

        SELECT User.username
        FROM User
        WHERE username = ?;
    `;

    const VALUES = [data.email, data.username];

    pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.register = (data, callback) => {

    const SQLSTATEMENT = `
        INSERT INTO User (username, email, password)
        VALUES (?, ?, ?);
    `;

    const VALUES = [data.username, data.email, data.password];

    pool.query(SQLSTATEMENT, VALUES, callback);
};
