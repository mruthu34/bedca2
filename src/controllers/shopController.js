const itemModel = require("../models/itemModel");
const inventoryModel = require("../models/inventoryModel");
const usermodel = require("../models/userModel");
const bossModel = require("../models/bossModel");
const { applyDifficultyToItems, getBossDifficultyMultiplier, getBossMinBonus } = require("../utils/bossDifficulty");

const INVENTORY_SLOT_PACK = 5;
const INVENTORY_SLOT_COST = 100;

const runSteps = (steps, req, res, next) => {
  let index = 0;
  const run = (err) => {
    if (err) return next(err);
    if (res.headersSent) return;
    const step = steps[index++];
    if (!step) return;
    try {
      step(req, res, run);
    } catch (e) {
      return next(e);
    }
  };
  run();
};
module.exports.listItems = (req, res, next) => {
  bossModel.selectActiveBoss((bossErr, boss) => onListItemsBoss(bossErr, boss, req, res, next));
};

const onListItemsBoss = (bossErr, boss, req, res, next) => {
  if (bossErr) {
    console.error("Error listItems (boss):", bossErr);
    return next(bossErr);
  }
  const multiplier = getBossDifficultyMultiplier(boss);
  const minBonus = getBossMinBonus(boss);
  res.locals.listItems = { multiplier, minBonus };
  return itemModel.selectAll((error, results) => onListItemsItems(error, results, req, res, next));
};

const onListItemsItems = (error, results, req, res, next) => {
  if (error) {
    console.error("Error listItems:", error);
    return next(error);
  }
  const { multiplier, minBonus } = res.locals.listItems;
  const scaled = applyDifficultyToItems(results, multiplier, minBonus);
  return res.status(200).json(scaled);
};

const validateBuyItem = (req, res, next) => {
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

  res.locals.buyItem = { userId, itemId, itemName, quantity };
  return next();
};

const loadItem = (req, res, next) => {
  const { itemId, itemName } = res.locals.buyItem;
  const selectItem = itemName ? itemModel.selectByName : itemModel.selectById;
  const selectData = itemName ? { name: itemName } : { item_id: itemId };

  selectItem(selectData, (errItem, itemRows) => {
    if (errItem) {
      console.error("Error select item:", errItem);
      return next(errItem);
    }
    if (itemRows.length === 0) {
      return res.status(404).json({ message: "Item not found" });
    }

    const item = itemRows[0];
    res.locals.buyItem.item = item;
    res.locals.buyItem.totalCost = item.cost_points * res.locals.buyItem.quantity;
    return next();
  });
};

const loadUserAndCheckPoints = (req, res, next) => {
  const { userId, totalCost } = res.locals.buyItem;

  usermodel.selectById({ user_id: userId }, (errUser, userRows) => {
    if (errUser) {
      console.error("Error select user:", errUser);
      return next(errUser);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];
    if (user.points < totalCost) {
      return res.status(403).json({ message: "Not enough points" });
    }

    res.locals.buyItem.user = user;
    return next();
  });
};

const checkInventoryCapacity = (req, res, next) => {
  const { userId, quantity, user } = res.locals.buyItem;
  const capacity = Number(user.inventory_capacity) || 20;

  inventoryModel.sumQuantityByUserId({ user_id: userId }, (errSum, sumRows) => {
    if (errSum) {
      console.error("Error sum inventory:", errSum);
      return next(errSum);
    }
    const current = sumRows?.[0]?.total_quantity ?? 0;
    if (current + quantity > capacity) {
      return res.status(409).json({
        message: "Inventory full. Buy more inventory in the shop.",
        current,
        capacity
      });
    }
    return next();
  });
};

const deductPoints = (req, res, next) => {
  const { userId, totalCost } = res.locals.buyItem;

  usermodel.deductPointsIfEnough({ user_id: userId, points: totalCost }, (errDeduct, resultDeduct) => {
    if (errDeduct) {
      console.error("Error deduct points:", errDeduct);
      return next(errDeduct);
    }
    if (resultDeduct.affectedRows === 0) {
      return res.status(403).json({ message: "Not enough points" });
    }
    return next();
  });
};

const updateInventory = (req, res, next) => {
  const { userId, item, quantity } = res.locals.buyItem;

  inventoryModel.insertOrIncrease(
    { user_id: userId, item_id: item.item_id, quantity: quantity },
    (errInv) => {
      if (errInv) {
        console.error("Error update inventory:", errInv);
        return next(errInv);
      }
      return next();
    }
  );
};

const sendBuyItemResponse = (req, res) => {
  const { item, quantity, totalCost, user } = res.locals.buyItem;
  return res.status(201).json({
    item_id: item.item_id,
    name: item.name,
    quantity: quantity,
    total_cost: totalCost,
    points_remaining: user.points - totalCost
  });
};

module.exports.buyItem = (req, res, next) => runSteps([
  validateBuyItem,
  loadItem,
  loadUserAndCheckPoints,
  checkInventoryCapacity,
  deductPoints,
  updateInventory,
  sendBuyItemResponse
], req, res, next);

const validateBuyCapacity = (req, res, next) => {
  const userId = req.user && req.user.user_id;
  const quantity = req.body.qty === undefined ? 1 : parseInt(req.body.qty, 10);

  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Error: qty must be a positive integer" });
  }

  res.locals.buyCapacity = { userId, quantity };
  return next();
};

const loadUserForCapacity = (req, res, next) => {
  const { userId } = res.locals.buyCapacity;
  usermodel.selectById({ user_id: userId }, (errUser, userRows) => {
    if (errUser) {
      console.error("Error select user:", errUser);
      return next(errUser);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRows[0];
    res.locals.buyCapacity.user = user;
    res.locals.buyCapacity.totalCost = INVENTORY_SLOT_COST * res.locals.buyCapacity.quantity;
    return next();
  });
};

const checkPointsForCapacity = (req, res, next) => {
  const { user, totalCost } = res.locals.buyCapacity;
  if (user.points < totalCost) {
    return res.status(403).json({ message: "Not enough points" });
  }
  return next();
};

const deductPointsForCapacity = (req, res, next) => {
  const { userId, totalCost } = res.locals.buyCapacity;
  usermodel.deductPointsIfEnough({ user_id: userId, points: totalCost }, (errDeduct, resultDeduct) => {
    if (errDeduct) {
      console.error("Error deduct points:", errDeduct);
      return next(errDeduct);
    }
    if (resultDeduct.affectedRows === 0) {
      return res.status(403).json({ message: "Not enough points" });
    }
    return next();
  });
};

const increaseCapacity = (req, res, next) => {
  const { userId, quantity } = res.locals.buyCapacity;
  const slots = quantity * INVENTORY_SLOT_PACK;
  usermodel.increaseInventoryCapacity({ user_id: userId, slots }, (errInc) => {
    if (errInc) {
      console.error("Error increase inventory capacity:", errInc);
      return next(errInc);
    }
    res.locals.buyCapacity.slots = slots;
    return next();
  });
};

const sendCapacityResponse = (req, res) => {
  const { user, quantity, totalCost, slots } = res.locals.buyCapacity;
  const capacity = (Number(user.inventory_capacity) || 20) + slots;
  return res.status(201).json({
    slots_added: slots,
    pack_size: INVENTORY_SLOT_PACK,
    quantity,
    total_cost: totalCost,
    inventory_capacity: capacity,
    points_remaining: user.points - totalCost
  });
};

module.exports.buyCapacity = (req, res, next) => runSteps([
  validateBuyCapacity,
  loadUserForCapacity,
  checkPointsForCapacity,
  deductPointsForCapacity,
  increaseCapacity,
  sendCapacityResponse
], req, res, next);
