const express = require('express');
const { createMessage } = require('../controllers/messages.controller');

const router = express.Router();

router.post('/', createMessage);

module.exports = router;
