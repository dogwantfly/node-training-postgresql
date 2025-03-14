const express = require('express')
const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Users')
const users = require('../controllers/users')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const handleErrorAsync = require('../utils/handleErrorAsync')

router.post('/signup', handleErrorAsync(users.postSignup))
router.post('/login', handleErrorAsync(users.postLogin))
router.get('/profile', auth, handleErrorAsync(users.getProfile))
router.get('/credit-package', auth, handleErrorAsync(users.getCreditPackage))
router.put('/profile', auth, handleErrorAsync(users.putProfile))
router.put('/password', auth, handleErrorAsync(users.putPassword))
router.get('/courses', auth, handleErrorAsync(users.getCourseBooking))

module.exports = router
