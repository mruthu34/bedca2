const express = require('express');
const router = express.Router();


const userRoute = require('./userRoute.js');
const challengeRoute=require('./challengeRoute.js');
const completionRoute=require('./completionRoute.js');
const bossRoute = require("./bossRoute"); 
const shopRoute = require("./shopRoute");
const inventoryRoute = require("./inventoryRoute");
const bcryptMiddleware = require('../middleware/bcryptMiddleware');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const userController = require('../controllers/userController');
const exampleController = require('../controllers/exampleController');

const loginChain = [
    userController.login,
    bcryptMiddleware.comparePassword,
    jwtMiddleware.generateToken,
    jwtMiddleware.sendToken
];

const registerChain = [
    userController.checkUsernameOrEmailExist,
    bcryptMiddleware.hashPassword,
    userController.register,
    jwtMiddleware.generateToken,
    jwtMiddleware.sendToken
];

const jwtGenerateChain = [
    exampleController.preTokenGenerate,
    jwtMiddleware.generateToken,
    exampleController.beforeSendToken,
    jwtMiddleware.sendToken
];

const bcryptCompareChain = [
    exampleController.preCompare,
    bcryptMiddleware.comparePassword,
    exampleController.showCompareSuccess
];

const bcryptHashChain = [
    bcryptMiddleware.hashPassword,
    exampleController.showHashing
];


router.use('/users', userRoute);
router.use('/challenges',challengeRoute)
router.use("/boss", bossRoute);
router.use("/shop", shopRoute);
router.use("/inventory", inventoryRoute);
router.post("/login", loginChain);
router.post("/register", registerChain);

router.post("/jwt/generate", jwtGenerateChain);
router.get("/jwt/verify", jwtMiddleware.verifyToken, exampleController.showTokenVerified);
router.post("/bcrypt/compare", bcryptCompareChain);
router.post("/bcrypt/hash", bcryptHashChain);




module.exports = router;



