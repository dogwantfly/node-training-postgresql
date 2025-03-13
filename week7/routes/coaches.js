const express = require('express')

const router = express.Router()
const coaches = require('../controllers/coaches')
const handleErrorAsync = require('../utils/handleErrorAsync');

router.get('/', handleErrorAsync(coaches.getCoaches))

router.get('/:coachId', handleErrorAsync(coaches.getCoachDetail))

router.get('/:coachId/courses', handleErrorAsync(coaches.getCoachCourses))

module.exports = router
