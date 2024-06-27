const express = require('express')
const { getUserId, latency } = require('../controllers/userController')
const { signup, signin, newToken, logout } = require('../controllers/authController')
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router()

// get user id
router.get('/info', authenticateToken, getUserId)

// latency
router.get('/latency', authenticateToken, latency)

// signup
router.post('/signup', signup)

// signin
router.post('/signin', signin)

// new_token
router.post('/new_token', newToken)

// logout
router.post('/logout', authenticateToken, logout)

module.exports = router