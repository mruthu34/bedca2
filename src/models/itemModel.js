const pool = require("../services/db");

// Item bonus damage is derived from cost for simple scaling.
const BONUS_RATIO = 1.5;

module.exports.selectAll = (callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, ROUND(cost_points * ${BONUS_RATIO}) AS bonus_damage, multiplier, description
    FROM Item
    ORDER BY item_id ASC;
  `;
  pool.query(SQLSTATEMENT, callback);
};

module.exports.selectById = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, ROUND(cost_points * ${BONUS_RATIO}) AS bonus_damage, multiplier, description
    FROM Item
    WHERE item_id = ?;
  `;
  const VALUES = [data.item_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectByName = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT item_id, name, cost_points, ROUND(cost_points * ${BONUS_RATIO}) AS bonus_damage, multiplier, description
    FROM Item
    WHERE name = ?;
  `;
  const VALUES = [data.name];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
