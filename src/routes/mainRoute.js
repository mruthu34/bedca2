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

// Health check endpoint - useful for debugging on Render
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection test
router.get('/health/db', (req, res) => {
  const pool = require('../services/db');
  
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ 
        status: 'ERROR',
        message: 'Database connection failed',
        error: err.message
      });
    }
    
    connection.release();
    res.status(200).json({ 
      status: 'OK',
      message: 'Database connected successfully',
      timestamp: new Date().toISOString()
    });
  });
});

router.use('/users', userRoute);
router.use('/challenges',challengeRoute)
router.use("/boss", bossRoute);
router.use("/shop", shopRoute);
router.use("/inventory", inventoryRoute);
// Login/registration are multi-step pipelines (validation -> bcrypt -> jwt).
router.post("/login", userController.login, bcryptMiddleware.comparePassword, jwtMiddleware.generateToken, jwtMiddleware.sendToken);
router.post("/register", userController.checkUsernameOrEmailExist, bcryptMiddleware.hashPassword, userController.register, jwtMiddleware.generateToken, jwtMiddleware.sendToken);

router.post("/jwt/generate", exampleController.preTokenGenerate, jwtMiddleware.generateToken, exampleController.beforeSendToken, jwtMiddleware.sendToken);
router.get("/jwt/verify", jwtMiddleware.verifyToken, exampleController.showTokenVerified);
router.post("/bcrypt/compare", exampleController.preCompare, bcryptMiddleware.comparePassword, exampleController.showCompareSuccess);
router.post("/bcrypt/hash", bcryptMiddleware.hashPassword, exampleController.showHashing);




module.exports = router;



