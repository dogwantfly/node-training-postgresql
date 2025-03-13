const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CoachesController')
const {
  isUndefined,
  isNotValidString,
  isNotValidUuid,
  isNotValidDate,
} = require('../utils/validUtils');
const appError = require('../utils/appError');

async function getCoaches (req, res, next) {
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
}

async function getCoachDetail (req, res, next) {
  const { coachId } = req.params;
  if (isUndefined(coachId) || isNotValidUuid(coachId)) {
    next(appError(400, 'ID 錯誤'));
    return;
  }
  const coach = await dataSource.getRepository('Coach').findOne({
    select: {
      id: true,
      user_id: true,
      experience_years: true,
      description: true,
      profile_image_url: true,
      created_at: true,
      updated_at: true,
      User: {
        name: true,
        role: true,
      },
    },
    where: {
      id: coachId,
    },
    relations: {
      User: true,
    },
  });
  if (!coach) {
    logger.warn('找不到該教練');
    res.status(400).json({
      status: 'failed',
      message: '找不到該教練',
    });
    return;
  }
  res.status(200).json({
    status: 'success',
    data: {
      user: coach.User,
      coach: {
        id: coach.id,
        user_id: coach.user_id,
        experience_years: coach.experience_years,
        description: coach.description,
        profile_image_url: coach.profile_image_url,
        created_at: coach.created_at,
        updated_at: coach.updated_at,
      },
    },
  });
}

async function getCoachCourses (req, res, next) {
  const { coachId } = req.params;
  if (isUndefined(coachId) || isNotValidUuid(coachId)) {
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  const coach = await dataSource.getRepository('Coach').findOne({
    select: {
      id: true,
      user_id: true,
      User: {
        name: true,
      },
    },
    where: {
      id: coachId,
    },
    relations: {
      User: true,
    },
  });
  if (!coach) {
    logger.warn('找不到該教練');
    next(appError(400, '找不到該教練'));
    return;
  }
  logger.info(`coach: ${JSON.stringify(coach)}`);
  const courses = await dataSource.getRepository('Course').find({
    select: {
      id: true,
      name: true,
      description: true,
      start_at: true,
      end_at: true,
      max_participants: true,
      Skill: {
        name: true,
      },
    },
    where: {
      user_id: coach.user_id,
    },
    relations: {
      Skill: true,
    },
  });
  logger.info(`courses: ${JSON.stringify(courses)}`);
  res.status(200).json({
    status: 'success',
    data: courses.map((course) => ({
      id: course.id,
      name: course.name,
      description: course.description,
      start_at: course.start_at,
      end_at: course.end_at,
      max_participants: course.max_participants,
      coach_name: coach.User.name,
      skill_name: course.Skill.name,
    })),
  });
}

module.exports = {
  getCoaches,
  getCoachDetail,
  getCoachCourses
}
