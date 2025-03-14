const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('SkillController')
const {
  isUndefined,
  isNotValidString,
  isNotValidUuid,
} = require('../utils/validUtils');
const appError = require('../utils/appError');


async function getAll (req, res, next) {
  const skills = await dataSource.getRepository('Skill').find({
    select: ['id', 'name'],
  });
  res.status(200).json({
    status: 'success',
    data: skills,
  });
}

async function post (req, res, next) {
  const { name } = req.body;
  if (isUndefined(name) || isNotValidString(name)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  const skillRepo = dataSource.getRepository('Skill');
  const existSkill = await skillRepo.findOne({
    where: {
      name,
    },
  });
  if (existSkill) {
    next(appError(409, '資料重複'));
    return;
  }
  const newSkill = await skillRepo.create({
    name,
  });
  const result = await skillRepo.save(newSkill);
  res.status(200).json({
    status: 'success',
    data: result,
  });
}

async function deleteSkill (req, res, next) {
  const { skillId } = req.params;
  if (isUndefined(skillId) || isNotValidUuid(skillId)) {
    next(appError(400, 'ID 錯誤'));
    return;
  }
  const result = await dataSource.getRepository('Skill').delete(skillId);
  if (result.affected === 0) {
    next(appError(400, 'ID 錯誤'));
    return;
  }
  res.status(200).json({
    status: 'success',
  });
}

module.exports = {
  getAll,
  post,
  deleteSkill
}
