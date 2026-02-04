
const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwtMiddleware');
const userController = require('../controllers/userController');

router.post('/', userController.createNewUser);
router.get('/', userController.readAllUser);
router.get("/me/points", jwtMiddleware.verifyToken, userController.getMyPoints);
router.get("/me/profile", jwtMiddleware.verifyToken, userController.getMyProfile);
router.delete("/me", jwtMiddleware.verifyToken, userController.deleteMe);
router.get("/:user_id", userController.readUserById);
router.put('/:user_id', userController.updateUserById);

router.delete("/delete/:player_id", jwtMiddleware.verifyToken, userController.deletePlayer);
router.post('/createPlayer', jwtMiddleware.verifyToken, userController.createNewPlayer, userController.createPlayerUserRel);
router.put('/player/:player_id', jwtMiddleware.verifyToken, userController.updatePlayerById)

module.exports = router;


