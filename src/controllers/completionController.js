const completionModel = require("../models/completionModel");
const bossModel = require("../models/bossModel");
const userEffectModel = require("../models/userEffectModel");
const usermodel = require("../models/userModel");
const challengeModel = require("../models/challengeModel");

const BOSS_NAMES = [
  "Stress Dragon",
  "Burnout Titan",
  "Anxiety Kraken",
  "Procrastination Phantom",
  "Deadline Demon",
  "Caffeine Golem",
  "Mind Fog Colossus",
  "Overcommitment Hydra",
  "Meeting Minotaur",
  "Inbox Wraith",
  "Focus Lord",
  "Perfectionism Cyclops"
];

function pickNextBossName(currentName){
  const normalized = (currentName || "").trim().toLowerCase();
  const idx = BOSS_NAMES.findIndex((name) => name.toLowerCase() === normalized);
  if (idx === -1) {
    return BOSS_NAMES[0];
  }
  return BOSS_NAMES[(idx + 1) % BOSS_NAMES.length];
}

module.exports.getUsersByChallengeId = (req, res, next) => {
  const data = {
    challenge_id: req.params.id
  };

  completionModel.selectById(data, (error, results) => {
    if (error) {
      console.error("Error:getUsersByChallengeId", error);
      return next(error);
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No attempts found for this challenge" });
    }

    const output = results.map((r) => ({
      user_id: r.user_id,
      details: r.details
    }));
    return res.status(200).json(output);
  });
};

module.exports.deleteUserCompletions = (req, res, next) => {
  const data = {
    challenge_id: req.params.id
  };

  completionModel.deleteByChallengeId(data, (error, results) => {
    if (error) {
      console.error("Error deleteUserCompletions:", error);
      return next(error);
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Completion not found" });
    }
    return res.status(204).send();
  });
};

const initCompletionFlow = (applyBossDamage) => (req, res, next) => {
  const data = {
    challenge_id: req.params.challenge_id ?? req.params.id,
    user_id: req.user && req.user.user_id,
    details: req.body.details
  };

  if (data.user_id == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (data.challenge_id == undefined) {
    return res.status(400).json({ message: "Error: challenge_id is required" });
  }

  res.locals.completion = { data, applyBossDamage };
  return next();
};

const loadUserForCompletion = (req, res, next) => {
  const { data } = res.locals.completion;

  usermodel.selectById({ user_id: data.user_id }, (err, userRows) => {
    if (err) {
      console.error("Error checking user:", err);
      return next(err);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.locals.completion.user = userRows[0];
    return next();
  });
};

const loadChallenge = (req, res, next) => {
  const { data } = res.locals.completion;

  challengeModel.selectById({ id: data.challenge_id }, (err2, challengeRows) => {
    if (err2) {
      console.error("Error checking challenge:", err2);
      return next(err2);
    }
    if (challengeRows.length === 0) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    res.locals.completion.challenge = challengeRows[0];
    return next();
  });
};

const insertCompletion = (req, res, next) => {
  const { data } = res.locals.completion;

  completionModel.insertSingle(data, (err3, result3) => {
    if (err3) {
      console.error("Error inserting completion:", err3);
      return next(err3);
    }
    res.locals.completion.completionId = result3.insertId;
    return next();
  });
};

const addPointsToUser = (req, res, next) => {
  const { data, challenge, applyBossDamage } = res.locals.completion;

  usermodel.addPoints({ user_id: data.user_id, points: challenge.points }, (err4) => {
    if (err4) {
      console.error("Error adding points:", err4);
      return next(err4);
    }
    if (!applyBossDamage) {
      return sendCompletionResponse(req, res);
    }
    return next();
  });
};

const loadUserEffect = (req, res, next) => {
  const { data, challenge } = res.locals.completion;

  userEffectModel.selectByUserId({ user_id: data.user_id }, (errEff, effRows) => {
    if (errEff) {
      console.error("Error getting user effect:", errEff);
      return next(errEff);
    }
    const effect = effRows.length ? effRows[0] : { bonus_damage: 0, multiplier: 1.0 };
    res.locals.completion.effectRows = effRows;
    res.locals.completion.effect = effect;
    res.locals.completion.damage = (challenge.points * effect.multiplier) + effect.bonus_damage;
    return next();
  });
};

const loadActiveBossForCompletion = (req, res, next) => {
  const { data, effectRows } = res.locals.completion;

  bossModel.selectActiveBoss((errB, boss) => {
    if (errB) {
      console.error("Error getting boss:", errB);
      return next(errB);
    }
    if (!boss) {
      if (effectRows.length) {
        return userEffectModel.clearByUserId({ user_id: data.user_id }, (errClear) => {
          if (errClear) {
            console.error("Error clearing user effect:", errClear);
            return next(errClear);
          }
          return sendCompletionResponse(req, res);
        });
      }
      return sendCompletionResponse(req, res);
    }
    res.locals.completion.boss = boss;
    return next();
  });
};

const logBossDamage = (req, res, next) => {
  const { data, boss, completionId, damage } = res.locals.completion;

  bossModel.insertDamageLog(boss.boss_id, data.user_id, completionId, damage, 0, (errL) => {
    if (errL) {
      console.error("Error logging boss damage:", errL);
      return next(errL);
    }
    return next();
  });
};

const updateBossHp = (req, res, next) => {
  const { boss, damage } = res.locals.completion;

  bossModel.updateBossHp(boss.boss_id, damage, (errU) => {
    if (errU) {
      console.error("Error updating boss hp:", errU);
      return next(errU);
    }
    return next();
  });
};

const deactivateBossIfDead = (req, res, next) => {
  const { boss } = res.locals.completion;

  bossModel.deactivateBossIfDead(boss.boss_id, (errD, resultD) => {
    if (errD) {
      console.error("Error deactivating boss:", errD);
      return next(errD);
    }
    res.locals.completion.deactivateResult = resultD;
    return next();
  });
};

const spawnBossIfDead = (req, res, next) => {
  const { boss, deactivateResult } = res.locals.completion;

  if (deactivateResult.affectedRows !== 1) {
    return next();
  }
  const newMaxHp = Math.ceil(boss.max_hp * 1.25) + 50;
  const newName = pickNextBossName(boss.name);

  return bossModel.spawnBoss(newName, newMaxHp, (errS) => {
    if (errS) {
      console.error("Error spawning new boss:", errS);
      return next(errS);
    }
    return next();
  });
};

const clearEffectIfAny = (req, res, next) => {
  const { data, effectRows } = res.locals.completion;

  if (!effectRows.length) {
    return next();
  }
  return userEffectModel.clearByUserId({ user_id: data.user_id }, (errClear) => {
    if (errClear) {
      console.error("Error clearing user effect:", errClear);
      return next(errClear);
    }
    return next();
  });
};

const sendCompletionResponse = (req, res) => {
  const { data, completionId } = res.locals.completion;
  return res.status(201).json({
    complete_id: completionId,
    challenge_id: parseInt(data.challenge_id, 10),
    user_id: data.user_id,
    details: data.details
  });
};

module.exports.createNewCompletionRecord = [
  initCompletionFlow(false),
  loadUserForCompletion,
  loadChallenge,
  insertCompletion,
  addPointsToUser,
  loadUserEffect,
  loadActiveBossForCompletion,
  logBossDamage,
  updateBossHp,
  deactivateBossIfDead,
  spawnBossIfDead,
  clearEffectIfAny,
  sendCompletionResponse
];

const initHitBoss = (req, res, next) => {
  const pointsSpent = req.body && parseInt(req.body.points_spent, 10);
  const userId = req.user && req.user.user_id;

  if (userId == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (!Number.isInteger(pointsSpent) || pointsSpent <= 0) {
    return res.status(400).json({ message: "Error: points_spent must be a positive integer" });
  }

  res.locals.hitBoss = { userId, pointsSpent };
  return next();
};

const loadUserForHitBoss = (req, res, next) => {
  const { userId } = res.locals.hitBoss;

  usermodel.selectById({ user_id: userId }, (err, userRows) => {
    if (err) {
      console.error("Error checking user:", err);
      return next(err);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRows[0];
    if (user.points < res.locals.hitBoss.pointsSpent) {
      return res.status(403).json({ message: "Not enough points" });
    }
    res.locals.hitBoss.user = user;
    return next();
  });
};

const deductPointsForHitBoss = (req, res, next) => {
  const { userId, pointsSpent } = res.locals.hitBoss;

  usermodel.deductPointsIfEnough({ user_id: userId, points: pointsSpent }, (errDeduct, resultDeduct) => {
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

const loadEffectForHitBoss = (req, res, next) => {
  const { userId, pointsSpent } = res.locals.hitBoss;

  userEffectModel.selectByUserId({ user_id: userId }, (errEff, effRows) => {
    if (errEff) {
      console.error("Error getting user effect:", errEff);
      return next(errEff);
    }
    const effect = effRows.length ? effRows[0] : { bonus_damage: 0, multiplier: 1.0 };
    res.locals.hitBoss.effectRows = effRows;
    res.locals.hitBoss.effect = effect;
    res.locals.hitBoss.damage = (pointsSpent * effect.multiplier) + effect.bonus_damage;
    return next();
  });
};

const loadActiveBossForHitBoss = (req, res, next) => {
  const { userId, effectRows } = res.locals.hitBoss;

  bossModel.selectActiveBoss((errB, boss) => {
    if (errB) {
      console.error("Error getting boss:", errB);
      return next(errB);
    }
    if (!boss) {
      if (effectRows.length) {
        return userEffectModel.clearByUserId({ user_id: userId }, (errClear) => {
          if (errClear) {
            console.error("Error clearing user effect:", errClear);
            return next(errClear);
          }
          return res.status(404).json({ message: "No active boss found" });
        });
      }
      return res.status(404).json({ message: "No active boss found" });
    }
    res.locals.hitBoss.boss = boss;
    return next();
  });
};

const logHitBossDamage = (req, res, next) => {
  const { boss, userId, damage, pointsSpent } = res.locals.hitBoss;

  bossModel.insertDamageLog(boss.boss_id, userId, null, damage, pointsSpent, (errL) => {
    if (errL) {
      console.error("Error logging boss damage:", errL);
      return next(errL);
    }
    return next();
  });
};

const updateHitBossHp = (req, res, next) => {
  const { boss, damage } = res.locals.hitBoss;

  bossModel.updateBossHp(boss.boss_id, damage, (errU) => {
    if (errU) {
      console.error("Error updating boss hp:", errU);
      return next(errU);
    }
    return next();
  });
};

const deactivateHitBossIfDead = (req, res, next) => {
  const { boss } = res.locals.hitBoss;

  bossModel.deactivateBossIfDead(boss.boss_id, (errD, resultD) => {
    if (errD) {
      console.error("Error deactivating boss:", errD);
      return next(errD);
    }
    res.locals.hitBoss.deactivateResult = resultD;
    return next();
  });
};

const spawnBossAfterHitIfDead = (req, res, next) => {
  const { boss, deactivateResult } = res.locals.hitBoss;

  if (deactivateResult.affectedRows !== 1) {
    return next();
  }
  const newMaxHp = Math.ceil(boss.max_hp * 1.25) + 50;
  const newName = pickNextBossName(boss.name);

  return bossModel.spawnBoss(newName, newMaxHp, (errS) => {
    if (errS) {
      console.error("Error spawning new boss:", errS);
      return next(errS);
    }
    return next();
  });
};

const clearEffectAfterHitIfAny = (req, res, next) => {
  const { userId, effectRows } = res.locals.hitBoss;

  if (!effectRows.length) {
    return next();
  }
  return userEffectModel.clearByUserId({ user_id: userId }, (errClear) => {
    if (errClear) {
      console.error("Error clearing user effect:", errClear);
      return next(errClear);
    }
    return next();
  });
};

const sendHitBossResponse = (req, res) => {
  const { boss, damage, pointsSpent, user } = res.locals.hitBoss;
  return res.status(200).json({
    boss_id: boss.boss_id,
    damage: damage,
    points_spent: pointsSpent,
    points_remaining: user.points - pointsSpent
  });
};

module.exports.hitBoss = [
  initHitBoss,
  loadUserForHitBoss,
  deductPointsForHitBoss,
  loadEffectForHitBoss,
  loadActiveBossForHitBoss,
  logHitBossDamage,
  updateHitBossHp,
  deactivateHitBossIfDead,
  spawnBossAfterHitIfDead,
  clearEffectAfterHitIfAny,
  sendHitBossResponse
];
