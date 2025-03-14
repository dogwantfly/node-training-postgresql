const express = require('express')

const router = express.Router()
const skill = require('../controllers/skill')
const handleErrorAsync = require('../utils/handleErrorAsync')

router.get('/', handleErrorAsync(skill.getAll))

router.post('/', handleErrorAsync(skill.post))

router.delete('/:skillId', handleErrorAsync(skill.deleteSkill))

module.exports = router
