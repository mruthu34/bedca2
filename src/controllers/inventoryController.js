const inventoryModel = require("../models/inventoryModel");
const userEffectModel = require("../models/userEffectModel");
const bossModel = require("../models/bossModel");
const {
  applyDifficultyToItems,
  getBossDifficultyMultiplier,
  getBossMinBonus,
  scaleBonusDamage
} = require("../utils/bossDifficulty");

// Return user inventory with boss difficulty scaling applied to item stats.
module.exports.getInventory = (req, res, next) => {
  const userId = req.user && req.user.user_id;
  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }

  res.locals.inventory = { userId };
  bossModel.selectActiveBoss((bossErr, boss) => onGetInventoryBoss(bossErr, boss, req, res, next));
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
  // Stash request-scoped data to avoid re-reading req in later steps.
  res.locals.useItem = { userId, itemId };
  userEffectModel.selectByUserId({ user_id: userId }, (errActive, activeRows) =>
    onCheckActiveEffect(errActive, activeRows, req, res, next)
  );
};

// Fetch current boss to compute difficulty scaling for display.
const onGetInventoryBoss = (bossErr, boss, req, res, next) => {
  if (bossErr) {
    console.error("Error getInventory (boss):", bossErr);
    return next(bossErr);
  }
  const multiplier = getBossDifficultyMultiplier(boss);
  const minBonus = getBossMinBonus(boss);
  res.locals.inventory.multiplier = multiplier;
  res.locals.inventory.minBonus = minBonus;

  return inventoryModel.selectByUserId(
    { user_id: res.locals.inventory.userId },
    (error, results) => onGetInventoryItems(error, results, req, res, next)
  );
};

const onGetInventoryItems = (error, results, req, res, next) => {
  if (error) {
    console.error("Error getInventory:", error);
    return next(error);
  }
  const { multiplier, minBonus } = res.locals.inventory;
  // Scale item stats so the UI reflects current boss difficulty.
  const scaled = applyDifficultyToItems(results, multiplier, minBonus);
  return res.status(200).json(scaled);
};

// Only allow one active effect at a time to prevent stacking bonuses.
const onCheckActiveEffect = (errActive, activeRows, req, res, next) => {
  if (errActive) {
    console.error("Error checking active effect:", errActive);
    return next(errActive);
  }
  if (activeRows.length) {
    return res.status(409).json({
      message: "You already have an active item effect. Use it first before applying another."
    });
  }

  const { userId, itemId } = res.locals.useItem;
  return inventoryModel.selectByUserAndItem(
    { user_id: userId, item_id: itemId },
    (errSel, rows) => onSelectInventoryItem(errSel, rows, req, res, next)
  );
};

const onSelectInventoryItem = (errSel, rows, req, res, next) => {
  if (errSel) {
    console.error("Error select inventory item:", errSel);
    return next(errSel);
  }
  // Guard against using items the user doesn't actually own.
  if (rows.length === 0 || rows[0].quantity <= 0) {
    return res.status(404).json({ message: "Item not in inventory" });
  }

  res.locals.useItem.item = rows[0];
  return bossModel.selectActiveBoss((bossErr, boss) => onUseItemBoss(bossErr, boss, req, res, next));
};

const onUseItemBoss = (bossErr, boss, req, res, next) => {
  if (bossErr) {
    console.error("Error useItem (boss):", bossErr);
    return next(bossErr);
  }
  const { item, userId, itemId } = res.locals.useItem;
  const multiplier = getBossDifficultyMultiplier(boss);
  const minBonus = getBossMinBonus(boss);
  // Scale flat bonus damage using boss difficulty rules.
  const scaledBonus = scaleBonusDamage(item.bonus_damage, multiplier, minBonus);

  res.locals.useItem.multiplier = multiplier;
  res.locals.useItem.scaledBonus = scaledBonus;

  // Consume the item before applying its effect.
  return inventoryModel.decreaseQuantity(
    { user_id: userId, item_id: itemId },
    (errDec, resultDec) => onDecreaseQuantity(errDec, resultDec, req, res, next)
  );
};

const onDecreaseQuantity = (errDec, resultDec, req, res, next) => {
  if (errDec) {
    console.error("Error decrease inventory:", errDec);
    return next(errDec);
  }
  if (resultDec.affectedRows === 0) {
    return res.status(404).json({ message: "Item not in inventory" });
  }

  const { userId, itemId } = res.locals.useItem;
  return inventoryModel.deleteIfZero(
    { user_id: userId, item_id: itemId },
    (errDel) => onDeleteIfZero(errDel, req, res, next)
  );
};

const onDeleteIfZero = (errDel, req, res, next) => {
  if (errDel) {
    console.error("Error cleanup inventory:", errDel);
    return next(errDel);
  }
  const { userId, itemId, item, scaledBonus, multiplier } = res.locals.useItem;
  // Store the effect so the next completion/boss hit can consume it.
  return userEffectModel.upsertEffect(
    { user_id: userId, bonus_damage: scaledBonus, multiplier: item.multiplier },
    (errEff) => onUpsertEffect(errEff, req, res, next)
  );
};

const onUpsertEffect = (errEff, req, res, next) => {
  if (errEff) {
    console.error("Error set user effect:", errEff);
    return next(errEff);
  }

  const { itemId, item, scaledBonus, multiplier } = res.locals.useItem;
  return res.status(200).json({
    message: "Item used for next completion",
    item_id: itemId,
    bonus_damage: scaledBonus,
    multiplier: item.multiplier,
    difficulty_multiplier: multiplier
  });
};
