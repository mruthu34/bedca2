const express = require('express');
const router = express.Router();

const challengeController = require('../controllers/challengeController');
const completionController = require('../controllers/completionController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

const attachUserFromToken = (req, res, next) => {
  req.user = { user_id: res.locals.userId };
  next();
};

const createChallengeChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken,
  challengeController.createChallenge
];
const reviewChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken
];

const deleteChallengeChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken,
  challengeController.deleteChallengeById
];

const updateChallengeChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken,
  challengeController.updateChallengeById
];

const createCompletionChain = [
  jwtMiddleware.verifyToken,
  attachUserFromToken,
  completionController.createNewCompletionRecord
];

// Challenges CRUD
router.post('/', createChallengeChain);
router.get('/', challengeController.readAllChallenge);
router.delete('/:id', deleteChallengeChain);
router.put('/:id', updateChallengeChain);
router.get('/:id/reviews', challengeController.getReviewsByChallenge);
router.post('/:id/reviews', reviewChain, challengeController.createReview);

// User Completions 
router.post('/:challenge_id', createCompletionChain);
router.get('/:id', completionController.getUsersByChallengeId);

module.exports = router;




