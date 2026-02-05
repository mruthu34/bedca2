const pool = require("../services/db");

// Keep bonus damage consistent with item model calculation.
const BONUS_RATIO = 1.5;

module.exports.selectByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT i.item_id, i.name, i.cost_points, ROUND(i.cost_points * ${BONUS_RATIO}) AS bonus_damage, i.multiplier, i.description, inv.quantity
    FROM Inventory inv
    JOIN Item i ON i.item_id = inv.item_id
    WHERE inv.user_id = ?
    ORDER BY i.item_id ASC;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.sumQuantityByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT COALESCE(SUM(quantity), 0) AS total_quantity
    FROM Inventory
    WHERE user_id = ?;
  `;
  const VALUES = [data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Upsert to avoid separate "exists" queries.
module.exports.insertOrIncrease = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO Inventory (user_id, item_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity);
  `;
  const VALUES = [data.user_id, data.item_id, data.quantity];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.selectByUserAndItem = (data, callback) => {
  const SQLSTATEMENT = `
    SELECT inv.user_id, inv.item_id, inv.quantity, ROUND(i.cost_points * ${BONUS_RATIO}) AS bonus_damage, i.multiplier
    FROM Inventory inv
    JOIN Item i ON i.item_id = inv.item_id
    WHERE inv.user_id = ? AND inv.item_id = ?;
  `;
  const VALUES = [data.user_id, data.item_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.decreaseQuantity = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE Inventory
    SET quantity = quantity - 1
    WHERE user_id = ? AND item_id = ? AND quantity > 0;
  `;
  const VALUES = [data.user_id, data.item_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.deleteIfZero = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM Inventory
    WHERE user_id = ? AND item_id = ? AND quantity <= 0;
  `;
  const VALUES = [data.user_id, data.item_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
