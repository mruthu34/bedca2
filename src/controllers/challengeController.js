const challengeModel = require('../models/challengeModel');
const usermodel = require("../models/userModel");

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

    const callback = (error, results, fields) => {
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

    challengeModel.createChallenge(data, callback);
}
