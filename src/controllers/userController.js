const usermodel = require("../models/userModel");
const playerModel = require("../models/playerModel");

module.exports.readAllUser = (req, res, next) =>
{
    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error readAllUser:", error);
            res.status(500).json(error);
        } 
        else res.status(200).json(results);
    }

    usermodel.selectAll(callback);
}
module.exports.readUserById = (req, res, next) =>
{   
    const callback = (error, results, fields) => {
        if (error) {
            console.error("Error readUserById:", error);
            res.status(500).json(error);
        }
        else if (results.length === 0) {
            res.status(404).send("User not found");
        }
        else {
            res.status(200).json(results[0]);
        }
    }

    usermodel.selectById({user_id: req.params.user_id}, callback);
}

module.exports.updateUserById = (req, res, next) =>
{
    if(req.body.username == undefined || req.body.points == undefined)
    {
        res.status(400).json({
            message: "Error: username or points is undefined"
        });
        return;
    }

    const data = {
        user_id: req.params.user_id,
        username: req.body.username,
        points: req.body.points
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

            console.error("Error updateUserById:", error);
            res.status(500).json(error);
        } else {
            if(results.affectedRows == 0)
            {
                res.status(404).json({
                    message: "User not found"
                });
            }
            else {
                // brief expects 200 + updated object (not 204)
                res.status(200).json({
                    user_id: parseInt(data.user_id),
                    username: data.username,
                    points: data.points
                });
            }
        }
    }

    usermodel.updateById(data, callback);
}

module.exports.getMyPoints = (req, res) => {
    const userId = req.user && req.user.user_id;
    if (userId == undefined) {
        return res.status(401).json({ message: "Error: missing user token" });
    }

    usermodel.selectById({ user_id: userId }, (error, results) => {
        if (error) {
            console.error("Error getMyPoints:", error);
            return res.status(500).json(error);
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ points: results[0].points });
    });
};

module.exports.getMyProfile = (req, res) => {
    const userId = req.user && req.user.user_id;
    if (userId == undefined) {
        return res.status(401).json({ message: "Error: missing user token" });
    }

    usermodel.selectProfileStats({ user_id: userId }, (error, results) => {
        if (error) {
            console.error("Error getMyProfile:", error);
            return res.status(500).json(error);
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const row = results[0];
        return res.status(200).json({
            user_id: row.user_id,
            username: row.username,
            points: row.points,
            total_damage: row.total_damage,
            total_points_spent: row.total_points_spent
        });
    });
};

module.exports.deleteMe = (req, res) => {
    const userId = req.user && req.user.user_id;
    if (userId == undefined) {
        return res.status(401).json({ message: "Error: missing user token" });
    }

    usermodel.deleteById({ user_id: userId }, (error, results) => {
        if (error) {
            console.error("Error deleteMe:", error);
            return res.status(500).json(error);
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(204).send();
    });
};



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
            // Duplicate username -> 409
            if (error.code === "ER_DUP_ENTRY") {
                res.status(409).json({
                    message: "Username already exists"
                });
                return;
            }
            console.error("Error createNewUser:", error);
            res.status(500).json(error);
        } else {
            res.status(201).json({
                user_id: results.insertId,
                username: data.username,
                points: 0
            });
        }
    }

    usermodel.insertSingle(data, callback);
}
module.exports.login = (req, res, next) => {
    try { 
        const requiredFields = ['username', 'password'];

        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === "") {
                res.status(400).json({ message: `${field} is undefined or empty` });
                return;
            }
        };

        const data = {
            username: req.body.username
        };

        const callback = (error, results) => {
            if(error){
                console.error("Error login callback: ", error);
                res.status(500).json(error);
            } else {
                if(results.length == 0){
                    res.status(404).json({message: "User not found"}); 
                } else {
                    res.locals.userId = results[0].user_id
                    res.locals.hash = results[0].password
                    next();
                }
            }
        };

        usermodel.login(data, callback);

    } catch (error) {
        console.error("Error login: ", error);
        res.status(500).json(error);
    }
};

//////////////////////////////////////////////////////
// CONTROLLER FOR REGISTER
//////////////////////////////////////////////////////
module.exports.checkUsernameOrEmailExist = (req, res, next) => {
    try {
        const requiredFields = ['username', 'email'];
        const allowedEmailDomains = ['gmail.com', 'hotmail.com', 'outlook.com'];

        for (const field of requiredFields) {
            if (req.body[field] === undefined || req.body[field] === "") {
                res.status(400).json({ message: `${field} is undefined or empty` });
                return;
            }
        };

        const email = String(req.body.email).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: "email is invalid" });
            return;
        }
        const domain = email.toLowerCase().split('@')[1];
        if (!allowedEmailDomains.includes(domain)) {
            res.status(400).json({ message: `Email must be from: ${allowedEmailDomains.join(', ')}` });
            return;
        }
    
        const data = {
            email,
            username: req.body.username
        };

        const callback = (error, results) => {
            if(error){
                console.error("Error readUserByEmailAndUsername callback: ", error);
                res.status(500).json(error);
            } else {
                if(results[1].length != 0 || results[0].length != 0){
                    res.status(409).json({message: "Username or email already exists"});
                } else {
                    next();
                }
            }
        };

        usermodel.readUserByEmailAndUsername(data, callback);

    } catch (error) {
        console.error("Error readUserByEmailAndUsername: ", error);
        res.status(500).json(error);
    }

};

module.exports.register = (req, res, next) => {
        try { 
            const data = {
                email: req.body.email,
                username: req.body.username,
                password: res.locals.hash
            };
    
            const callback = (error, results) => {
                if(error){
                    console.error("Error register callback: ", error);
                    res.status(500).json(error);
                } else {
                    res.locals.userId = results.insertId;
                    res.locals.message = `User ${req.body.username} created successfully.`;
                    next();
                }
            };
    
            usermodel.register(data, callback);
    
        } catch (error) {
            console.error("Error register: ", error);
            res.status(500).json(error);
        }
};

module.exports.deletePlayer = (req, res) => {
    try {
        const data = {
            player_id: req.params.player_id,
        }

        const callback = (error, results) => {
            if(error){
                console.error("Error: deletePlayer callback:", error);
                res.status(500).json(error);
            } else {
                const deleteResult = Array.isArray(results) ? results[0] : results;
                if(deleteResult.affectedRows == 0){
                    res.status(404).json({message: "update player error"})
                } else {
                    res.status(204).send()    
                }
            }
        };

        playerModel.deletePlayer(data, callback);

    } catch (error) {
        console.error("Error: deletePlayer:", error);
        res.status(500).json(error);
    }
};

module.exports.createNewPlayer = (req, res, next) =>
{
    if(req.body.name == undefined || req.body.level == undefined)
    {
        res.status(400).json({
            message: "Error: name or level is undefined"
        });
        return;
    }

    const data = {
        name: req.body.name,
        level: req.body.level
    }

    const callback = (error, results) => {
        if (error) {
            console.error("Error createNewPlayer:", error);
            res.status(500).json(error);
        } else {
            res.locals.playerId = results.insertId;
            res.locals.playerName = data.name;
            res.locals.playerLevel = data.level;
            next();
        }
    }

    playerModel.insertSingle(data, callback);
}

module.exports.createPlayerUserRel = (req, res) => {
    if (!res.locals.playerId || !res.locals.userId) {
        res.status(400).json({ message: "Error: missing player or user id" });
        return;
    }

    const data = {
        player_id: res.locals.playerId,
        user_id: res.locals.userId
    };

    const callback = (error) => {
        if (error) {
            console.error("Error createPlayerUserRel:", error);
            res.status(500).json(error);
        } else {
            res.status(201).json({
                player_id: data.player_id,
                user_id: data.user_id,
                name: res.locals.playerName,
                level: res.locals.playerLevel
            });
        }
    };

    playerModel.insertPlayerUserRelationship(data, callback);
};

module.exports.updatePlayerById = (req, res) =>
{
    if(req.body.name == undefined || req.body.level == undefined)
    {
        res.status(400).json({
            message: "Error: name or level is undefined"
        });
        return;
    }

    const data = {
        id: req.params.player_id,
        name: req.body.name,
        level: req.body.level
    }

    const callback = (error, results) => {
        if (error) {
            console.error("Error updatePlayerById:", error);
            res.status(500).json(error);
        } else {
            if(results.affectedRows == 0)
            {
                res.status(404).json({
                    message: "Player not found"
                });
            }
            else {
                res.status(200).json({
                    player_id: parseInt(data.id),
                    name: data.name,
                    level: data.level
                });
            }
        }
    }

    playerModel.updateById(data, callback);
}
