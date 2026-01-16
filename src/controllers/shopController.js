const itemModel = require("../models/itemModel");
const inventoryModel = require("../models/inventoryModel");
const usermodel = require("../models/userModel");

module.exports.listItems = (req, res) => {
  itemModel.selectAll((error, results) => {
    if (error) {
      console.error("Error listItems:", error);
      return res.status(500).json(error);
    }
    return res.status(200).json(results);
  });
};

module.exports.buyItem = (req, res) => {
  const userId = req.user && req.user.user_id;
  const itemId = req.body.item_id;
  const itemName = req.body.item_name;
  const quantity = req.body.qty === undefined ? 1 : parseInt(req.body.qty, 10);

  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (itemId == undefined && itemName == undefined) {
    return res.status(400).json({ message: "Error: item_name or item_id is required" });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Error: quantity must be a positive integer" });
  }

  const selectItem = itemName
    ? itemModel.selectByName
    : itemModel.selectById;
  const selectData = itemName
    ? { name: itemName }
    : { item_id: itemId };

  selectItem(selectData, (errItem, itemRows) => {
    if (errItem) {
      console.error("Error select item:", errItem);
      return res.status(500).json(errItem);
    }
    if (itemRows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = itemRows[0];
    const totalCost = item.cost_points * quantity;

    usermodel.selectById({ user_id: userId }, (errUser, userRows) => {
      if (errUser) {
        console.error("Error select user:", errUser);
        return res.status(500).json(errUser);
      }
      if (userRows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userRows[0];
      if (user.points < totalCost) {
        return res.status(403).json({ message: "Not enough points" });
      }

      usermodel.deductPointsIfEnough({ user_id: userId, points: totalCost }, (errDeduct, resultDeduct) => {
        if (errDeduct) {
          console.error("Error deduct points:", errDeduct);
          return res.status(500).json(errDeduct);
        }
        if (resultDeduct.affectedRows === 0) {
          return res.status(403).json({ message: "Not enough points" });
        }

        inventoryModel.insertOrIncrease(
          { user_id: userId, item_id: item.item_id, quantity: quantity },
          (errInv) => {
            if (errInv) {
              console.error("Error update inventory:", errInv);
              return res.status(500).json(errInv);
            }

            return res.status(201).json({
              item_id: item.item_id,
              name: item.name,
              quantity: quantity,
              total_cost: totalCost,
              points_remaining: user.points - totalCost
            });
          }
        );
      });
    });
  });
};
