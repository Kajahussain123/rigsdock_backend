const express = require('express');
const { refreshAccessToken } = require('../../controllers/refreshToken/refreshtoken');

const router = express.Router();

router.post('/refresh-token', refreshAccessToken);

module.exports = router;
