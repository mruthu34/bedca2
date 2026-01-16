const completionModel = require('../models/completionModel');
const bossModel = require("../models/bossModel");
const userEffectModel = require("../models/userEffectModel");


module.exports.getUsersByChallengeId = (req, res, next) => {
    const data = {
        challenge_id: req.params.id
    }

    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error:getUsersByChallengeId", error);
            res.status(500).json(error);
        } else {
            if (results.length == 0) {
                res.status(404).json({
                    message: "No attempts found for this challenge"
                });
            }
            else {
                const output = results.map(r => ({
                    user_id: r.user_id,
                    details: r.details
                }));
                res.status(200).json(output);
            }
        }
    }

    completionModel.selectById(data, callback);
}

module.exports.deleteUserCompletions = (req, res, next) => {
    const data = {
        challenge_id: req.params.id
    }

    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error deleteUserCompletions:", error);
            res.status(500).json(error);
        } else {
            if (results.affectedRows == 0) {
                res.status(404).json({
                    message: "Completion not found"
                });
            }
            else res.status(204).send(); // 204 No Content            
        }
    }

    completionModel.deleteByChallengeId(data, callback);
}

const usermodel = require("../models/userModel");
const challengeModel = require("../models/challengeModel");

const runCompletionFlow = (req, res, challengeId, applyBossDamage) => {
  const data = {
    challenge_id: challengeId,
    user_id: req.user && req.user.user_id,
    details: req.body.details
  };

  if (data.user_id == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (data.challenge_id == undefined) {
    return res.status(400).json({ message: "Error: challenge_id is required" });
  }

  const sendCompletion = (completionId) => {
    return res.status(201).json({
      complete_id: completionId,
      challenge_id: parseInt(data.challenge_id),
      user_id: data.user_id,
      details: data.details
    });
  };

  // 1) check user
  usermodel.selectById({ user_id: data.user_id }, (err, userRows) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).json(err);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2) check challenge
    challengeModel.selectById({ id: data.challenge_id }, (err2, challengeRows) => {
      if (err2) {
        console.error("Error checking challenge:", err2);
        return res.status(500).json(err2);
      }
      if (challengeRows.length === 0) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      const challenge = challengeRows[0];

        // 3) insert completion
      completionModel.insertSingle(data, (err3, result3) => {
        if (err3) {
          console.error("Error inserting completion:", err3);
          return res.status(500).json(err3);
        }

        const completionId = result3.insertId;

        // 4) add points to user
        usermodel.addPoints({ user_id: data.user_id, points: challenge.points }, (err4) => {
          if (err4) {
            console.error("Error adding points:", err4);
            return res.status(500).json(err4);
          }

          if (!applyBossDamage) {
            return sendCompletion(completionId);
          }

          // 5) boss (apply one-time effect)
          userEffectModel.selectByUserId({ user_id: data.user_id }, (errEff, effRows) => {
            if (errEff) {
              console.error("Error getting user effect:", errEff);
              return res.status(500).json(errEff);
            }

            const effect = effRows.length ? effRows[0] : { bonus_damage: 0, multiplier: 1.0 };
            const damage = (challenge.points * effect.multiplier) + effect.bonus_damage;

            bossModel.selectActiveBoss((errB, boss) => {
              if (errB) {
                console.error("Error getting boss:", errB);
                return res.status(500).json(errB);
              }

              // If no boss still succeed
              if (!boss) {
                if (effRows.length) {
                  return userEffectModel.clearByUserId({ user_id: data.user_id }, () => {
                    return sendCompletion(completionId);
                  });
                }
                return sendCompletion(completionId);
              }

              // log damage
              bossModel.insertDamageLog(boss.boss_id, data.user_id, completionId, damage, (errL) => {
                if (errL) {
                  console.error("Error logging boss damage:", errL);
                  return res.status(500).json(errL);
                }

                // reduce hp
                bossModel.updateBossHp(boss.boss_id, damage, (errU) => {
                  if (errU) {
                    console.error("Error updating boss hp:", errU);
                    return res.status(500).json(errU);
                  }

                  // if boss dead, spawn new boss
                  bossModel.deactivateBossIfDead(boss.boss_id, (errD, resultD) => {
                    if (errD) {
                      console.error("Error deactivating boss:", errD);
                      return res.status(500).json(errD);
                    }

                    const finish = () => {
                      if (resultD.affectedRows === 1) {
                        const newMaxHp = Math.ceil(boss.max_hp * 1.25) + 50;
                        const bossNames = [
                          "Stress Dragon",
                          "Burnout Titan",
                          "Anxiety Kraken",
                          "Procrastination Phantom",
                          "Deadline Demon",
                          "Caffeine Golem"
                        ];
                        const newName = bossNames[boss.boss_id % bossNames.length];

                        bossModel.spawnBoss(newName, newMaxHp, (errS) => {
                          if (errS) {
                            console.error("Error spawning new boss:", errS);
                            return res.status(500).json(errS);
                          }
                          return sendCompletion(completionId);
                        });
                      } else {
                        return sendCompletion(completionId);
                      }
                    };

                    if (effRows.length) {
                      return userEffectModel.clearByUserId({ user_id: data.user_id }, (errClear) => {
                        if (errClear) {
                          console.error("Error clearing user effect:", errClear);
                          return res.status(500).json(errClear);
                        }
                        return finish();
                      });
                    }

                    return finish();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

module.exports.createNewCompletionRecord = (req, res, next) => {
  const challengeId = req.params.challenge_id ?? req.params.id;
  return runCompletionFlow(req, res, challengeId, false);
};

module.exports.hitBoss = (req, res, next) => {
  const pointsSpent = req.body && parseInt(req.body.points_spent, 10);
  const data = {
    user_id: req.user && req.user.user_id
  };

  if (data.user_id == undefined) {
    return res.status(401).json({ message: "Error: missing user token" });
  }
  if (!Number.isInteger(pointsSpent) || pointsSpent <= 0) {
    return res.status(400).json({ message: "Error: points_spent must be a positive integer" });
  }

  // 1) check user
  usermodel.selectById({ user_id: data.user_id }, (err, userRows) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).json(err);
    }
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];
    if (user.points < pointsSpent) {
      return res.status(403).json({ message: "Not enough points" });
    }

    usermodel.deductPointsIfEnough({ user_id: data.user_id, points: pointsSpent }, (errDeduct, resultDeduct) => {
      if (errDeduct) {
        console.error("Error deduct points:", errDeduct);
        return res.status(500).json(errDeduct);
      }
      if (resultDeduct.affectedRows === 0) {
        return res.status(403).json({ message: "Not enough points" });
      }

      // 2) boss damage (no completion insert)
      userEffectModel.selectByUserId({ user_id: data.user_id }, (errEff, effRows) => {
        if (errEff) {
          console.error("Error getting user effect:", errEff);
          return res.status(500).json(errEff);
        }

        const effect = effRows.length ? effRows[0] : { bonus_damage: 0, multiplier: 1.0 };
        const damage = (pointsSpent * effect.multiplier) + effect.bonus_damage;

        bossModel.selectActiveBoss((errB, boss) => {
          if (errB) {
            console.error("Error getting boss:", errB);
            return res.status(500).json(errB);
          }

          if (!boss) {
            if (effRows.length) {
              return userEffectModel.clearByUserId({ user_id: data.user_id }, () => {
                return res.status(404).json({ message: "No active boss found" });
              });
            }
            return res.status(404).json({ message: "No active boss found" });
          }

          bossModel.insertDamageLog(boss.boss_id, data.user_id, null, damage, (errL) => {
            if (errL) {
              console.error("Error logging boss damage:", errL);
              return res.status(500).json(errL);
            }

            bossModel.updateBossHp(boss.boss_id, damage, (errU) => {
              if (errU) {
                console.error("Error updating boss hp:", errU);
                return res.status(500).json(errU);
              }

              bossModel.deactivateBossIfDead(boss.boss_id, (errD, resultD) => {
                if (errD) {
                  console.error("Error deactivating boss:", errD);
                  return res.status(500).json(errD);
                }

                const finish = () =>
                  res.status(200).json({
                    boss_id: boss.boss_id,
                    damage: damage,
                    points_spent: pointsSpent,
                    points_remaining: user.points - pointsSpent
                  });

                const spawnIfDead = () => {
                  if (resultD.affectedRows === 1) {
                    const newMaxHp = Math.ceil(boss.max_hp * 1.25) + 50;
                    const bossNames = [
                      "Stress Dragon",
                      "Burnout Titan",
                      "Anxiety Kraken",
                      "Procrastination Phantom",
                      "Deadline Demon",
                      "Caffeine Golem"
                    ];
                    const newName = bossNames[boss.boss_id % bossNames.length];

                    return bossModel.spawnBoss(newName, newMaxHp, (errS) => {
                      if (errS) {
                        console.error("Error spawning new boss:", errS);
                        return res.status(500).json(errS);
                      }
                      return finish();
                    });
                  }
                  return finish();
                };

                if (effRows.length) {
                  return userEffectModel.clearByUserId({ user_id: data.user_id }, (errClear) => {
                    if (errClear) {
                      console.error("Error clearing user effect:", errClear);
                      return res.status(500).json(errClear);
                    }
                    return spawnIfDead();
                  });
                }

                return spawnIfDead();
              });
            });
          });
        });
      });
    });
  });
};
    
