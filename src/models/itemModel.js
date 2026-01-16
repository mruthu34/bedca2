const pool = require("../services/db");

module.exports.selectAll = (callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, bonus_damage, multiplier, description
    FROM Item
    ORDER BY item_id ASC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, bonus_damage, multiplier, description
    FROM Item
    WHERE item_id = ?;
  `;
  const VALUES = [data.item_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectByName = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, bonus_damage, multiplier, description
    FROM Item
    WHERE name = ?;
  `;
  const VALUES = [data.name];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
