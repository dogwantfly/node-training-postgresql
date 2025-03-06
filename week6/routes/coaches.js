const express = require('express');
const router = express.Router();
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Coach');

const {
  isUndefined,
  isNotValidString,
  isNotValidUuid,
  isNotValidDate,
} = require('../utils/validUtils');
const appError = require('../utils/appError');

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, per = 10 } = req.query;
    if (isUndefined(page) || isNotValidString(page) || page < 1) {
      next(appError(400, '頁碼錯誤'));
      return;
    }
    if (isUndefined(per) || isNotValidString(per) || per < 1) {
      next(appError(400, '列表長度錯誤'));
      return;
    }
    const pageNumber = Number(page);
    const perNumber = Number(per);
    if (isNaN(pageNumber) || isNaN(perNumber)) {
      next(appError(400, '頁碼或列表長度錯誤'));
      return;
    }
    const coachRepository = dataSource.getRepository('Coach');
    const coaches = await coachRepository
      .createQueryBuilder('coach')
      .leftJoinAndSelect('coach.User', 'user')
      .select([
        'coach.id',
        'coach.experience_years',
        'coach.description',
        'coach.profile_image_url',
        'user.name',
      ])
      .skip((pageNumber - 1) * perNumber)
      .take(perNumber)
      .getMany();

    res.status(200).json({
      status: 'success',
      data: coaches,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.get('/:coachId', async (req, res, next) => {
  try {
    const { coachId } = req.params;
    if (isUndefined(coachId) || isNotValidUuid(coachId)) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const coachRepository = dataSource.getRepository('Coach');
    const coach = await coachRepository
      .createQueryBuilder('coach')
      .leftJoinAndSelect('coach.User', 'user')
      .select([
        'coach.id',
        'coach.experience_years',
        'coach.description',
        'coach.profile_image_url',
        'user.name',
      ])
      .where('coach.id = :id', { id: coachId })
      .getOne();

    res.status(200).json({
      status: 'success',
      data: coach,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
});
module.exports = router;
