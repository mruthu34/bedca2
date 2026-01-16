const inventoryModel = require("../models/inventoryModel");
const userEffectModel = require("../models/userEffectModel");

module.exports.getInventory = (req, res) => {
  const userId = req.user && req.user.user_id;
  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }

  inventoryModel.selectByUserId({ user_id: userId }, (error, results) => {
    if (error) {
      console.error("Error getInventory:", error);
      return res.status(500).json(error);
    }
    return res.status(200).json(results);
  });
};

module.exports.useItem = (req, res) => {
  const userId = req.user && req.user.user_id;
  const itemId = req.body.item_id;

  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (itemId == undefined) {
    return res.status(400).json({ message: "Error: item_id is required" });
  }

  inventoryModel.selectByUserAndItem({ user_id: userId, item_id: itemId }, (errSel, rows) => {
    if (errSel) {
      console.error("Error select inventory item:", errSel);
      return res.status(500).json(errSel);
    }
    if (rows.length === 0 || rows[0].quantity <= 0) {
      return res.status(404).json({ message: "Item not in inventory" });
    }

    const item = rows[0];

    inventoryModel.decreaseQuantity({ user_id: userId, item_id: itemId }, (errDec, resultDec) => {
      if (errDec) {
        console.error("Error decrease inventory:", errDec);
        return res.status(500).json(errDec);
      }
      if (resultDec.affectedRows === 0) {
        return res.status(404).json({ message: "Item not in inventory" });
      }

      inventoryModel.deleteIfZero({ user_id: userId, item_id: itemId }, (errDel) => {
        if (errDel) {
          console.error("Error cleanup inventory:", errDel);
          return res.status(500).json(errDel);
        }

        userEffectModel.upsertEffect(
          { user_id: userId, bonus_damage: item.bonus_damage, multiplier: item.multiplier },
          (errEff) => {
            if (errEff) {
              console.error("Error set user effect:", errEff);
              return res.status(500).json(errEff);
            }

            return res.status(200).json({
              message: "Item used for next completion",
              item_id: itemId,
              bonus_damage: item.bonus_damage,
              multiplier: item.multiplier
            });
          }
        );
      });
    });
  });
};
