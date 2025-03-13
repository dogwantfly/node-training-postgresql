const express = require('express')
const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Courses')
const courses = require('../controllers/courses')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const handleErrorAsync = require('../utils/handleErrorAsync')

router.get('/', handleErrorAsync(courses.getAllCourses))
router.post('/:courseId', auth, handleErrorAsync(courses.postCourseBooking))
router.delete('/:courseId', auth, handleErrorAsync(courses.deleteCourseBooking))

module.exports = router
