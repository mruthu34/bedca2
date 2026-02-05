// Base HP for difficulty scaling (boss at this HP has multiplier 1).
const BASE_BOSS_HP = 500;
// Cap difficulty multiplier to keep items usable.
const MAX_MULTIPLIER = 3;
// Threshold at which flat bonus scaling kicks in.
const TARGET_BOSS_HP = 95962532;
const MIN_BONUS_AT_TARGET = 10000;
const MIN_BONUS_POW = 0.25;

// Multiplier increases with boss HP, clamped to [1, MAX_MULTIPLIER].
function getBossDifficultyMultiplier(boss) {
  const maxHp = Number(boss && boss.max_hp);
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 1;
  const raw = maxHp / BASE_BOSS_HP;
  const capped = Math.min(MAX_MULTIPLIER, Math.max(1, raw));
  return Math.round(capped * 100) / 100;
}

// Provide a minimum bonus floor once bosses get extremely large.
function getBossMinBonus(boss) {
  const maxHp = Number(boss && boss.max_hp);
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 0;
  if (maxHp < TARGET_BOSS_HP) return 0;
  const ratio = maxHp / TARGET_BOSS_HP;
  const scaled = MIN_BONUS_AT_TARGET * Math.pow(ratio, MIN_BONUS_POW);
  return Math.round(scaled);
}

// Scale base bonus damage and enforce the minimum floor.
function scaleBonusDamage(bonusDamage, multiplier, minBonus) {
  const base = Number(bonusDamage) || 0;
  const mult = Number(multiplier) || 1;
  const scaled = Math.round(base * mult);
  const min = Number(minBonus) || 0;
  return Math.max(scaled, min);
}

// Apply difficulty scaling to each item for UI display.
function applyDifficultyToItems(items, multiplier, minBonus) {
  return (items || []).map((it) => ({
    ...it,
    bonus_damage: scaleBonusDamage(it.bonus_damage, multiplier, minBonus),
    difficulty_multiplier: multiplier
  }));
}

module.exports = {
  BASE_BOSS_HP,
  MAX_MULTIPLIER,
  TARGET_BOSS_HP,
  MIN_BONUS_AT_TARGET,
  getBossDifficultyMultiplier,
  getBossMinBonus,
  scaleBonusDamage,
  applyDifficultyToItems
};
