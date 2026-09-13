const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { validateAiChatRequest } = require('../middlewares/validationMiddleware');

/**
 * @route   POST /ai/chat
 * @desc    Chat with Groq AI model
 */
router.post('/chat', validateAiChatRequest, aiController.chatWithAi);

module.exports = router;
