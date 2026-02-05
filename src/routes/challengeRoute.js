const express = require('express');
const router = express.Router();

const challengeController = require('../controllers/challengeController');
const completionController = require('../controllers/completionController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// Challenges CRUD (writes require auth).
router.post('/', jwtMiddleware.verifyToken, challengeController.createChallenge);
router.get('/', challengeController.readAllChallenge);
router.delete('/:id', jwtMiddleware.verifyToken, challengeController.deleteChallengeById);
router.put('/:id', jwtMiddleware.verifyToken, challengeController.updateChallengeById);
router.get('/:id/reviews', challengeController.getReviewsByChallenge);
router.post('/:id/reviews', jwtMiddleware.verifyToken, challengeController.createReview);

// User Completions (creating completion requires auth).
router.post('/:challenge_id', jwtMiddleware.verifyToken, completionController.createNewCompletionRecord);
router.get('/:id', completionController.getUsersByChallengeId);

module.exports = router;




