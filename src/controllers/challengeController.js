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

    res.locals.challengeDelete = {
        userId,
        id: req.params.id
    };

    challengeModel.selectById({ id: req.params.id }, (error, results) =>
        onDeleteChallengeSelect(error, results, req, res, next)
    );
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

    res.locals.challengeUpdate = {
        userId,
        id: req.params.id,
        description: req.body.description,
        points: req.body.points
    };

    challengeModel.selectById({ id: req.params.id }, (error, results) =>
        onUpdateChallengeSelect(error, results, req, res, next)
    );
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

    res.locals.challengeCreate = {
        user_id: userId,
        description: req.body.description,
        points: req.body.points
    };

    challengeModel.selectCreateCooldownByUserId({ user_id: userId }, (errCooldown, cooldownRows) =>
        onCreateCooldown(errCooldown, cooldownRows, req, res, next)
    );
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

    res.locals.reviewCreate = { userId, challengeId, rating, comment };
    completionModel.existsByChallengeAndUser({ challenge_id: challengeId, user_id: userId }, (errComp, compRows) =>
        onReviewCompletionCheck(errComp, compRows, req, res, next)
    );
};

const onDeleteChallengeSelect = (error, results, req, res, next) => {
    if (error) {
        console.error("Error deleteChallengeById (select):", error);
        return res.status(500).json(error);
    }
    if(results.length == 0)
    {
        return res.status(404).json({
            message: "Challenge not found"
        });
    }

    const challenge = results[0];
    const { userId, id } = res.locals.challengeDelete;

    if (challenge.creator_id != userId) {
        return res.status(403).json({
            message: "Forbidden: not the challenge owner"
        });
    }

    return challengeModel.deleteById({ id }, (error2, results2) =>
        onDeleteChallengeDelete(error2, results2, req, res, next)
    );
};

const onDeleteChallengeDelete = (error2, results2, req, res, next) => {
    if (error2) {
        console.error("Error deleteChallengeById (delete):", error2);
        return res.status(500).json(error2);
    }
    if(results2.affectedRows == 0)
    {
        return res.status(404).json({
            message: "Challenge not found"
        });
    }
    return res.status(204).send();
};

const onUpdateChallengeSelect = (error, results, req, res, next) => {
    if (error) {
        console.error("Error updateChallengeById (select):", error);
        return res.status(500).json(error);
    }
    if(results.length == 0)
    {
        return res.status(404).json({
            message: "Challenge not found"
        });
    }

    const challenge = results[0];
    const updateData = res.locals.challengeUpdate;

    // owner check (brief wants 403)
    if (challenge.creator_id != updateData.userId) {
        return res.status(403).json({
            message: "Forbidden: not the challenge owner"
        });
    }

    return challengeModel.updateById(
        { id: updateData.id, description: updateData.description, points: updateData.points },
        (error2, results2) => onUpdateChallengeUpdate(error2, results2, challenge, req, res, next)
    );
};

const onUpdateChallengeUpdate = (error2, results2, challenge, req, res, next) => {
    if (error2) {
        console.error("Error updateChallengeById (update):", error2);
        return res.status(500).json(error2);
    }
    const updateData = res.locals.challengeUpdate;
    return res.status(200).json({
        challenge_id: parseInt(updateData.id),
        description: updateData.description,
        creator_id: challenge.creator_id,
        creator_username: challenge.creator_username,
        points: updateData.points
    });
};

const onCreateCooldown = (errCooldown, cooldownRows, req, res, next) => {
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

    const { user_id } = res.locals.challengeCreate;
    return challengeModel.countCreatedTodayByUserId({ user_id }, (errCount, countRows) =>
        onCreateDailyLimit(errCount, countRows, req, res, next)
    );
};

const onCreateDailyLimit = (errCount, countRows, req, res, next) => {
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
    const data = res.locals.challengeCreate;
    return challengeModel.createChallenge(data, (error, results) =>
        onCreateChallengeInsert(error, results, req, res, next)
    );
};

const onCreateChallengeInsert = (error, results, req, res, next) => {
    if (error) {
        console.error("Error createChallenge:", error);
        return res.status(500).json(error);
    }
    const data = res.locals.challengeCreate;
    return res.status(201).json({
        challenge_id: results.insertId,
        description: data.description,
        creator_id: data.user_id,
        points: data.points
    });
};

const onReviewCompletionCheck = (errComp, compRows, req, res, next) => {
    if (errComp) {
        console.error("Error checking completion:", errComp);
        return res.status(500).json(errComp);
    }
    if (!compRows.length) {
        return res.status(403).json({ message: "You can only review challenges you completed." });
    }

    const { challengeId, userId } = res.locals.reviewCreate;
    return reviewModel.selectByChallengeAndUser({ challenge_id: challengeId, user_id: userId }, (errSel, rows) =>
        onReviewSelect(errSel, rows, req, res, next)
    );
};

const onReviewSelect = (errSel, rows, req, res, next) => {
    if (errSel) {
        console.error("Error checking review:", errSel);
        return res.status(500).json(errSel);
    }
    if (rows.length) {
        return onReviewUpdate(rows[0].review_id, req, res, next);
    }
    return onReviewInsert(req, res, next);
};

const onReviewUpdate = (reviewId, req, res, next) => {
    const { challengeId, userId, rating, comment } = res.locals.reviewCreate;
    return reviewModel.updateByChallengeAndUser(
        { challenge_id: challengeId, user_id: userId, rating, comment },
        (errUpd) => {
            if (errUpd) {
                console.error("Error updateReview:", errUpd);
                return res.status(500).json(errUpd);
            }
            return res.status(200).json({
                review_id: reviewId,
                challenge_id: parseInt(challengeId, 10),
                user_id: userId,
                rating,
                comment: comment || null,
                message: "Review updated."
            });
        }
    );
};

const onReviewInsert = (req, res, next) => {
    const { challengeId, userId, rating, comment } = res.locals.reviewCreate;
    return reviewModel.insertSingle(
        { challenge_id: challengeId, user_id: userId, rating, comment },
        (errIns, result) => {
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
        }
    );
};
