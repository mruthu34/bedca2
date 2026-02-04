const challengeModel = require('../models/challengeModel');
const usermodel = require("../models/userModel");
const reviewModel = require("../models/reviewModel");
const completionModel = require("../models/completionModel");

module.exports.createNewUser = (req, res, next) =>
{
    if(req.body.username == undefined)
    {
        res.status(400).send("Error: username is undefined");
        return;
    }

    const data = {
        username: req.body.username
    }

    const callback = (error, results, fields) => {
        if (error) {
            // duplicate username
            if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
                res.status(409).json({
                    message: "Username already exists"
                });
                return;
            }

            console.error("Error createNewUser:", error);
            res.status(500).json(error);
        } else {
            // brief expects object, not raw mysql results
            res.status(201).json({
                user_id: results.insertId,
                username: data.username,
                points: 0
            });
        }
    }

    usermodel.insertSingle(data, callback);
}


module.exports.readAllChallenge = (req, res, next) =>
{
    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error readAllChallenge:", error);
            res.status(500).json(error);
        } 
        else res.status(200).json(results);
    }

    challengeModel.selectAll(callback);
}
module.exports.deleteChallengeById = (req, res, next) =>
{
    const userId = req.user && req.user.user_id;
    if (userId == undefined) {
        res.status(401).json({ message: "Error: missing user token" });
        return;
    }

    const data = {
        id: req.params.id
    }

    const checkOwnerCallback = (error, results, fields) => {
        if (error) {
            console.error("Error deleteChallengeById (select):", error);
            res.status(500).json(error);
        } else {
            if(results.length == 0)
            {
                res.status(404).json({
                    message: "Challenge not found"
                });
                return;
            }

            const challenge = results[0];

            if (challenge.creator_id != userId) {
                res.status(403).json({
                    message: "Forbidden: not the challenge owner"
                });
                return;
            }

            const deleteCallback = (error2, results2, fields2) => {
                if (error2) {
                    console.error("Error deleteChallengeById (delete):", error2);
                    res.status(500).json(error2);
                } else {
                    if(results2.affectedRows == 0)
                    {
                        res.status(404).json({
                            message: "Challenge not found"
                        });
                    }
                    else {
                        res.status(204).send();
                    }
                }
            }

            challengeModel.deleteById(data, deleteCallback);
        }
    }

    challengeModel.selectById(data, checkOwnerCallback);
}

module.exports.updateChallengeById = (req, res, next) =>
{
    const userId = req.user && req.user.user_id;
    if(userId == undefined || req.body.description == undefined || req.body.points == undefined)
    {
        res.status(400).json({
            message: "Error: description or points is undefined"
        });
        return;
    }

    const checkData = {
        id: req.params.id
    }

    const updateData = {
        id: req.params.id,
        description: req.body.description,
        points: req.body.points
    }

    const checkOwnerCallback = (error, results, fields) => {
        if (error) {
            console.error("Error updateChallengeById (select):", error);
            res.status(500).json(error);
        } else {
            if(results.length == 0)
            {
                res.status(404).json({
                    message: "Challenge not found"
                });
                return;
            }

            const challenge = results[0];

            // owner check (brief wants 403)
            if (challenge.creator_id != userId) {
                res.status(403).json({
                    message: "Forbidden: not the challenge owner"
                });
                return;
            }

            const updateCallback = (error2, results2, fields2) => {
                if (error2) {
                    console.error("Error updateChallengeById (update):", error2);
                    res.status(500).json(error2);
                } else {
                    res.status(200).json({
                        challenge_id: parseInt(updateData.id),
                        description: updateData.description,
                        creator_id: challenge.creator_id,
                        creator_username: challenge.creator_username,
                        points: updateData.points
                    });
                }
            }

            challengeModel.updateById(updateData, updateCallback);
        }
    }

    challengeModel.selectById(checkData, checkOwnerCallback);
}

module.exports.deleteUserCompletions = (req, res, next) =>
{
    const data = {
        id: req.params.id
    }

    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error deleteUserCompletions:", error);
            res.status(500).json(error);
        } else {
            if(results.affectedRows == 0) 
            {
                res.status(404).json({
                    message: "Completion not found"
                });
            }
            else res.status(204).send(); // 204 No Content            
        }
    }

    challengeModel.deleteByUserId(data, callback);
}
module.exports.createChallenge = (req, res, next) =>
{
    const userId = req.user && req.user.user_id;
    if(userId == undefined || req.body.description == undefined || req.body.points == undefined)
    {
        res.status(400).json({
            message: "Error: description or points is undefined"
        });
        return;
    }

    const data = {
        user_id: userId,
        description: req.body.description,
        points: req.body.points
    }

    const createCallback = (error, results, fields) => {
        if (error) {
            console.error("Error createChallenge:", error);
            res.status(500).json(error);
        } else {
            res.status(201).json({
                challenge_id: results.insertId,
                description: data.description,
                creator_id: data.user_id,
                points: data.points
            });
        }
    }

    challengeModel.selectCreateCooldownByUserId({ user_id: userId }, (errCooldown, cooldownRows) => {
        if (errCooldown) {
            console.error("Error createChallenge (cooldown):", errCooldown);
            return res.status(500).json(errCooldown);
        }
        const secondsSince = cooldownRows?.[0]?.seconds_since;
        if (Number.isFinite(secondsSince) && secondsSince < 60) {
            const waitSeconds = Math.max(1, 60 - Math.floor(secondsSince));
            return res.status(429).json({
                message: `Please wait ${waitSeconds} seconds before creating another challenge.`,
                retry_after_seconds: waitSeconds
            });
        }

        challengeModel.countCreatedTodayByUserId({ user_id: userId }, (errCount, countRows) => {
            if (errCount) {
                console.error("Error createChallenge (daily limit):", errCount);
                return res.status(500).json(errCount);
            }
            const count = countRows?.[0]?.challenge_count ?? 0;
            if (count >= 1) {
                return res.status(429).json({
                    message: "You can only create one new challenge per day."
                });
            }
            return challengeModel.createChallenge(data, createCallback);
        });
    });
}

module.exports.getReviewsByChallenge = (req, res, next) => {
    const data = {
        challenge_id: req.params.id
    };

    reviewModel.selectByChallengeId(data, (error, results) => {
        if (error) {
            console.error("Error getReviewsByChallenge:", error);
            return res.status(500).json(error);
        }
        return res.status(200).json(results);
    });
};

module.exports.createReview = (req, res, next) => {
    const userId = req.user && req.user.user_id;
    const challengeId = req.params.id;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment;

    if (userId == undefined) {
        return res.status(401).json({ message: "Error: missing user token" });
    }
    if (challengeId == undefined) {
        return res.status(400).json({ message: "Error: challenge_id is required" });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Error: rating must be an integer 1-5" });
    }

    completionModel.existsByChallengeAndUser({ challenge_id: challengeId, user_id: userId }, (errComp, compRows) => {
        if (errComp) {
            console.error("Error checking completion:", errComp);
            return res.status(500).json(errComp);
        }
        if (!compRows.length) {
            return res.status(403).json({ message: "You can only review challenges you completed." });
        }

        reviewModel.selectByChallengeAndUser({ challenge_id: challengeId, user_id: userId }, (errSel, rows) => {
            if (errSel) {
                console.error("Error checking review:", errSel);
                return res.status(500).json(errSel);
            }
            if (rows.length) {
                return reviewModel.updateByChallengeAndUser(
                    { challenge_id: challengeId, user_id: userId, rating, comment },
                    (errUpd) => {
                        if (errUpd) {
                            console.error("Error updateReview:", errUpd);
                            return res.status(500).json(errUpd);
                        }
                        return res.status(200).json({
                            review_id: rows[0].review_id,
                            challenge_id: parseInt(challengeId, 10),
                            user_id: userId,
                            rating,
                            comment: comment || null,
                            message: "Review updated."
                        });
                    }
                );
            }

            reviewModel.insertSingle({ challenge_id: challengeId, user_id: userId, rating, comment }, (errIns, result) => {
                if (errIns) {
                    console.error("Error createReview:", errIns);
                    return res.status(500).json(errIns);
                }
                return res.status(201).json({
                    review_id: result.insertId,
                    challenge_id: parseInt(challengeId, 10),
                    user_id: userId,
                    rating,
                    comment: comment || null
                });
            });
        });
    });
};
