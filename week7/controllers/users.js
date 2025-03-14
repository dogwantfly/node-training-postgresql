const bcrypt = require('bcrypt')
const { IsNull, In } = require('typeorm')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('UsersController')
const {
  isUndefined,
  isNotValidString,
  isNotValidEmail,
  isNotValidPassword,
  isNotValidName,
} = require('../utils/validUtils');
const generateJWT = require('../utils/generateJWT')
const appError = require('../utils/appError')

async function postSignup (req, res, next) {
  const { name, email, password } = req.body;
  if (
    isUndefined(name) ||
    isNotValidString(name) ||
    isUndefined(email) ||
    isNotValidEmail(email) ||
    isUndefined(password) ||
    isNotValidString(password)
  ) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (isNotValidPassword(password)) {
    logger.warn(
      '建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
    );
    next(
      appError(
        400,
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      )
    );
    return;
  }
  const userRepository = dataSource.getRepository('User');
  const existingUser = await userRepository.findOne({
    where: { email },
  });

  if (existingUser) {
    logger.warn('建立使用者錯誤: Email 已被使用');
    next(appError(409, 'Email 已被使用'));
    return;
  }
  if (isNotValidName(name)) {
    logger.warn(
      '建立使用者錯誤: 名稱不符合規則，最少2個字，最多10個字，不可包含任何特殊符號與空白'
    );
    next(
      appError(
        400,
        '名稱不符合規則：最少2個字，最多10個字，不可包含任何特殊符號與空白'
      )
    );
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  const newUser = userRepository.create({
    name,
    email,
    role: 'USER',
    password: hashPassword,
  });
  const savedUser = await userRepository.save(newUser);
  logger.info('新建立的使用者ID:', savedUser.id);
  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: savedUser.id,
        name: savedUser.name,
      },
    },
  });
}

async function postLogin (req, res, next) {
  const { email, password } = req.body;
  if (
    isUndefined(email) ||
    isNotValidEmail(email) ||
    isUndefined(password) ||
    isNotValidString(password)
  ) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (isNotValidPassword(password)) {
    logger.warn(
      '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
    );
    res.status(400).json({
      status: 'failed',
      message:
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字',
    });
    return;
  }
  const userRepository = dataSource.getRepository('User');
  const existingUser = await userRepository.findOne({
    select: ['id', 'name', 'password', 'role'],
    where: { email },
  });

  if (!existingUser) {
    next(appError(400, '使用者不存在或密碼輸入錯誤'));
    return;
  }
  logger.info(`使用者資料: ${JSON.stringify(existingUser)}`);
  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    next(appError(400, '使用者不存在或密碼輸入錯誤'));
    return;
  }
  const token = await generateJWT(
    {
      id: existingUser.id,
      role: existingUser.role,
    },
    config.get('secret.jwtSecret'),
    {
      expiresIn: `${config.get('secret.jwtExpiresDay')}`,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      token,
      user: {
        name: existingUser.name,
      },
    },
  });
}

async function getProfile (req, res, next) {
  const { id } = req.user;
  if (!id) {
    logger.warn('未提供有效的使用者ID');
    next(appError(401, '驗證失敗，請重新登入'));
    return;
  }
  const userRepository = dataSource.getRepository('User');
  const user = await userRepository.findOne({
    select: ['name', 'email'],
    where: { id },
  });
  if (!user) {
    logger.warn(`找不到使用者資料 ID: ${id}`);
    next(appError(404, '找不到使用者資料'));
    return;
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
}

async function getCreditPackage (req, res, next) {
  const { id } = req.user;
  const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
  const creditPurchase = await creditPurchaseRepo.find({
    select: {
      purchased_credits: true,
      price_paid: true,
      purchaseAt: true,
      CreditPackage: {
        name: true,
      },
    },
    where: {
      user_id: id,
    },
    relations: {
      CreditPackage: true,
    },
  });
  res.status(200).json({
    status: 'success',
    data: creditPurchase.map((item) => {
      return {
        name: item.CreditPackage.name,
        purchased_credits: item.purchased_credits,
        price_paid: parseInt(item.price_paid, 10),
        purchase_at: item.purchaseAt,
      };
    }),
  });
}

async function putProfile (req, res, next) {
  const { id } = req.user;
  const { name } = req.body;
  if (isUndefined(name) || isNotValidString(name)) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  if (isNotValidName(name)) {
    logger.warn(
      `欄位驗證失敗 - name: ${name}, 名稱不符合規則，最少2個字，最多10個字，不可包含任何特殊符號與空白`
    );
    next(
      appError(
        400,
        '名稱不符合規則：最少2個字，最多10個字，不可包含任何特殊符號與空白'
      )
    );
    return;
  }
  const userRepository = dataSource.getRepository('User');
  const user = await userRepository.findOne({
    select: ['name'],
    where: {
      id,
    },
  });
  if (!user) {
    logger.warn(`找不到使用者 ID: ${id}`);
    next(appError(404, '找不到使用者資料'));
    return;
  }
  if (user.name === name) {
    next(appError(400, '使用者名稱未變更'));
    return;
  }
  const updatedResult = await userRepository.update(
    {
      id,
      name: user.name,
    },
    {
      name,
    }
  );
  if (updatedResult.affected === 0) {
    next(appError(400, '更新使用者資料失敗'));
    return;
  }
  const result = await userRepository.findOne({
    select: ['name'],
    where: {
      id,
    },
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: result,
    },
  });
}

async function putPassword (req, res, next) {
  const { id } = req.user;
  const {
    password,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  } = req.body;
  if (
    isUndefined(password) ||
    isNotValidString(password) ||
    isUndefined(newPassword) ||
    isNotValidString(newPassword) ||
    isUndefined(confirmNewPassword) ||
    isNotValidString(confirmNewPassword)
  ) {
    logger.warn('欄位未填寫正確');
    res.status(400).json({
      status: 'failed',
      message: '欄位未填寫正確',
    });
    return;
  }
  if (
    isNotValidPassword(password) ||
    isNotValidPassword(newPassword) ||
    isNotValidPassword(confirmNewPassword)
  ) {
    logger.warn(
      '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
    );
    res.status(400).json({
      status: 'failed',
      message:
        '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字',
    });
    return;
  }
  if (newPassword === password) {
    logger.warn('新密碼不能與舊密碼相同');
    res.status(400).json({
      status: 'failed',
      message: '新密碼不能與舊密碼相同',
    });
    return;
  }
  if (newPassword !== confirmNewPassword) {
    logger.warn('新密碼與驗證新密碼不一致');
    res.status(400).json({
      status: 'failed',
      message: '新密碼與驗證新密碼不一致',
    });
    return;
  }
  const userRepository = dataSource.getRepository('User');
  const existingUser = await userRepository.findOne({
    select: ['password'],
    where: { id },
  });
  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    next(appError(400, '密碼輸入錯誤'));
    return;
  }
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(newPassword, salt);
  const updatedResult = await userRepository.update(
    {
      id,
    },
    {
      password: hashPassword,
    }
  );
  if (updatedResult.affected === 0) {
    next(appError(400, '更新密碼失敗'));
    return;
  }
  res.status(200).json({
    status: 'success',
    data: null,
  });
}

async function getCourseBooking (req, res, next) {
    const { id } = req.user;
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
    const courseBookingRepo = dataSource.getRepository('CourseBooking');
    const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
      user_id: id,
    });
    const userUsedCredit = await courseBookingRepo.count({
      where: {
        user_id: id,
        cancelledAt: IsNull(),
      },
    });
    const courseBookingList = await courseBookingRepo.find({
      select: {
        course_id: true,
        Course: {
          name: true,
          start_at: true,
          end_at: true,
          meeting_url: true,
          user_id: true,
        },
      },
      where: {
        user_id: id,
      },
      order: {
        Course: {
          start_at: 'ASC',
        },
      },
      relations: {
        Course: true,
      },
    });
    const coachUserIdMap = {};
    if (courseBookingList.length > 0) {
      courseBookingList.forEach((courseBooking) => {
        coachUserIdMap[courseBooking.Course.user_id] =
          courseBooking.Course.user_id;
      });
      const userRepo = dataSource.getRepository('User');
      const coachUsers = await userRepo.find({
        select: ['id', 'name'],
        where: {
          id: In(Object.values(coachUserIdMap)),
        },
      });
      coachUsers.forEach((user) => {
        coachUserIdMap[user.id] = user.name;
      });
      logger.debug(`courseBookingList: ${JSON.stringify(courseBookingList)}`);
      logger.debug(`coachUsers: ${JSON.stringify(coachUsers)}`);
    }
    res.status(200).json({
      status: 'success',
      data: {
        credit_remain: userCredit - userUsedCredit,
        credit_usage: userUsedCredit,
        course_booking: courseBookingList.map((courseBooking) => {
          return {
            course_id: courseBooking.course_id,
            name: courseBooking.Course.name,
            start_at: courseBooking.Course.start_at,
            end_at: courseBooking.Course.end_at,
            meeting_url: courseBooking.Course.meeting_url,
            coach_name: coachUserIdMap[courseBooking.Course.user_id],
          };
        }),
      },
    });
}

module.exports = {
  postSignup,
  postLogin,
  getProfile,
  getCreditPackage,
  putProfile,
  putPassword,
  getCourseBooking
}
