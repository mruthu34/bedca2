
const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwtMiddleware');
const userController = require('../controllers/userController');

const getMyPointsChain = [
  jwtMiddleware.verifyToken,
  userController.getMyPoints
];

const getMyProfileChain = [
  jwtMiddleware.verifyToken,
  userController.getMyProfile
];

const deleteMeChain = [
  jwtMiddleware.verifyToken,
  userController.deleteMe
];

const deletePlayerChain = [
  jwtMiddleware.verifyToken,
  userController.deletePlayer
];

const createPlayerChain = [
  jwtMiddleware.verifyToken,
  userController.createNewPlayer,
  userController.createPlayerUserRel
];

const updatePlayerChain = [
  jwtMiddleware.verifyToken,
  userController.updatePlayerById
];

router.post('/', userController.createNewUser);
router.get('/', userController.readAllUser);
router.get("/me/points", getMyPointsChain);
router.get("/me/profile", getMyProfileChain);
router.delete("/me", deleteMeChain);
router.get("/:user_id", userController.readUserById);
router.put('/:user_id', userController.updateUserById);

router.delete("/delete/:player_id", deletePlayerChain);
router.post('/createPlayer', createPlayerChain);
router.put('/player/:player_id', updatePlayerChain)

module.exports = router;


