const { IsNull } = require('typeorm')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CoursesController')
const appError = require('../utils/appError')

async function getAllCourses (req, res, next) {
  const courses = await dataSource.getRepository('Course').find({
    select: {
      id: true,
      name: true,
      description: true,
      start_at: true,
      end_at: true,
      max_participants: true,
      User: {
        name: true,
      },
      Skill: {
        name: true,
      },
    },
    relations: {
      User: true,
      Skill: true,
    },
  });
  res.status(200).json({
    status: 'success',
    data: courses.map((course) => {
      return {
        id: course.id,
        name: course.name,
        description: course.description,
        start_at: course.start_at,
        end_at: course.end_at,
        max_participants: course.max_participants,
        coach_name: course.User.name,
        skill_name: course.Skill.name,
      };
    }),
  });
}

async function postCourseBooking (req, res, next) {
  const { id } = req.user;
  const { courseId } = req.params;
  const courseRepo = dataSource.getRepository('Course');
  const course = await courseRepo.findOne({
    where: {
      id: courseId,
    },
  });
  if (!course) {
    next(appError(400, 'ID 錯誤'));
    return;
  }
  const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
  const courseBookingRepo = dataSource.getRepository('CourseBooking');
  const userCourseBooking = await courseBookingRepo.findOne({
    where: {
      user_id: id,
      course_id: courseId,
      cancelledAt: IsNull(),
    },
  });
  if (userCourseBooking) {
    next(appError(400, '已經報名過此課程'));
    return;
  }
  const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
    user_id: id,
  });
  const userUsedCredit = await courseBookingRepo.count({
    where: {
      user_id: id,
      cancelledAt: IsNull(),
    },
  });
  const courseBookingCount = await courseBookingRepo.count({
    where: {
      course_id: courseId,
      cancelledAt: IsNull(),
    },
  });
  if (userUsedCredit >= userCredit) {
    next(appError(400, '已無可使用堂數'));
    return;
  } else if (courseBookingCount >= course.max_participants) {
    next(appError(400, '已達最大參加人數，無法參加'));
    return;
  }
  const newCourseBooking = await courseBookingRepo.create({
    user_id: id,
    course_id: courseId,
  });
  await courseBookingRepo.save(newCourseBooking);
  res.status(201).json({
    status: 'success',
    data: null,
  });
}

async function deleteCourseBooking (req, res, next) {
  const { id } = req.user;
  const { courseId } = req.params;
  const courseBookingRepo = dataSource.getRepository('CourseBooking');
  const userCourseBooking = await courseBookingRepo.findOne({
    where: {
      user_id: id,
      course_id: courseId,
      cancelledAt: IsNull(),
    },
  });
  if (!userCourseBooking) {
    next(appError(400, 'ID 錯誤'));
    return;
  }
  const updateResult = await courseBookingRepo.update(
    {
      user_id: id,
      course_id: courseId,
      cancelledAt: IsNull(),
    },
    {
      cancelledAt: new Date().toISOString(),
    }
  );
  if (updateResult.affected === 0) {
    next(appError(400, '取消失敗'));
    return;
  }
  res.status(200).json({
    status: 'success',
    data: null,
  });
}

module.exports = {
  getAllCourses,
  postCourseBooking,
  deleteCourseBooking
}
