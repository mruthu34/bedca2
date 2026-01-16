//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR TOKEN PRE-GENERATION
//////////////////////////////////////////////////////
module.exports.preTokenGenerate = (req, res, next) => {
    res.locals.userId = req.body.id;
    next();
}

//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR BEFORE SENDING TOKEN
//////////////////////////////////////////////////////
module.exports.beforeSendToken = (req, res, next) => {
    res.locals.message = `Token is generated.`;
    next();
}

//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR TOKEN VERIFICATION
//////////////////////////////////////////////////////
module.exports.showTokenVerified = (req, res, next) => {
    res.status(200).json({
        userId: res.locals.userId,
        message: "Token is verified."
    });
}

//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR BCRYPT COMPARE
//////////////////////////////////////////////////////
module.exports.showCompareSuccess = (req, res, next) => {
    res.status(200).json({
        message: "Compare is successful."
    });
}

//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR BCRYPT PRE-COMPARE
//////////////////////////////////////////////////////
module.exports.preCompare = (req, res, next) => {
    res.locals.hash = req.body.hash;
    next();
}

//////////////////////////////////////////////////////
// EXAMPLE CONTROLLER FOR BCRYPT HASHING
//////////////////////////////////////////////////////
module.exports.showHashing = (req, res, next) => {
    res.status(200).json({
        hash: res.locals.hash,
        message: `Hash is successful.`
    });
}