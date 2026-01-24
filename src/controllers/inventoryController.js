const inventoryModel = require("../models/inventoryModel");
const userEffectModel = require("../models/userEffectModel");

module.exports.getInventory = (req, res, next) => {
  const userId = req.user && req.user.user_id;
  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }

  inventoryModel.selectByUserId({ user_id: userId }, (error, results) => {
    if (error) {
      console.error("Error getInventory:", error);
      return next(error);
    }
    return res.status(200).json(results);
  });
};

module.exports.useItem = (req, res, next) => {
  const userId = req.user && req.user.user_id;
  const itemId = req.body.item_id;

  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (itemId == undefined) {
    return res.status(400).json({ message: "Error: item_id is required" });
  }

  // Prevent stacking/queueing multiple item effects.
  // Only allow ONE active effect at a time; user must consume it
  // (via a completion or boss hit) before using another item.
  userEffectModel.selectByUserId({ user_id: userId }, (errActive, activeRows) => {
    if (errActive) {
      console.error("Error checking active effect:", errActive);
      return next(errActive);
    }
    if (activeRows.length) {
      return res.status(409).json({
        message: "You already have an active item effect. Use it first before applying another."
      });
    }

    // No active effect — proceed to consume an item and set the effect.
    return inventoryModel.selectByUserAndItem({ user_id: userId, item_id: itemId }, (errSel, rows) => {
      if (errSel) {
        console.error("Error select inventory item:", errSel);
        return next(errSel);
      }
      if (rows.length === 0 || rows[0].quantity <= 0) {
        return res.status(404).json({ message: "Item not in inventory" });
      }

      const item = rows[0];

      return inventoryModel.decreaseQuantity({ user_id: userId, item_id: itemId }, (errDec, resultDec) => {
        if (errDec) {
          console.error("Error decrease inventory:", errDec);
          return next(errDec);
        }
        if (resultDec.affectedRows === 0) {
          return res.status(404).json({ message: "Item not in inventory" });
        }

        return inventoryModel.deleteIfZero({ user_id: userId, item_id: itemId }, (errDel) => {
          if (errDel) {
            console.error("Error cleanup inventory:", errDel);
            return next(errDel);
          }

          return userEffectModel.upsertEffect(
            { user_id: userId, bonus_damage: item.bonus_damage, multiplier: item.multiplier },
            (errEff) => {
              if (errEff) {
                console.error("Error set user effect:", errEff);
                return next(errEff);
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
  });
};
