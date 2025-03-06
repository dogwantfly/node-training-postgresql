const express = require('express');
const bcrypt = require('bcrypt');

const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('Users');
const generateJWT = require('../utils/generateJWT');
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger,
});

const {
  isUndefined,
  isNotValidString,
  isNotValidEmail,
  isNotValidPassword,
} = require('../utils/validUtils');
const appError = require('../utils/appError');

// 新增使用者
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // 驗證必填欄位
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
    // 檢查 email 是否已存在
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      logger.warn('建立使用者錯誤: Email 已被使用');
      next(appError(409, 'Email 已被使用'));
      return;
    }

    // 建立新使用者
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
  } catch (error) {
    logger.error('建立使用者錯誤:', error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
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
      select: ['id', 'name', 'password'],
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

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          name: existingUser.name,
        },
      },
    });
  } catch (error) {
    logger.error('登入錯誤:', error);
    next(error);
  }
});

router.get('/profile', auth, async (req, res, next) => {
  try {
    const { id } = req.user;
    if (!id) {
      logger.warn('未提供有效的使用者ID');
      next(appError(401, '驗證失敗，請重新登入'));
      return;
    }

    logger.info(`開始獲取使用者資料，使用者ID: ${id}`);

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

    logger.info(`成功獲取使用者資料 ID: ${id}`);
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('取得使用者資料錯誤:', error);
    next(error);
  }
});

router.put('/profile', auth, async (req, res, next) => {
  try {
    const { id } = req.user;
    const { name } = req.body;

    logger.info(`開始更新使用者資料，使用者ID: ${id}, 新名稱: ${name}`);

    if (isUndefined(name) || isNotValidString(name)) {
      logger.warn(`欄位驗證失敗 - name: ${name}`);
      next(appError(400, '欄位未填寫正確'));
      return;
    }
    const userRepository = dataSource.getRepository('User');
    const user = await userRepository.findOne({
      select: ['name'],
      where: { id },
    });

    if (!user) {
      logger.warn(`找不到使用者 ID: ${id}`);
      next(appError(404, '找不到使用者資料'));
      return;
    }

    if (user.name === name) {
      logger.info(`使用者名稱未變更 ID: ${id}`);
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
  } catch (error) {
    logger.error('更新使用者資料錯誤:', error);
    next(error);
  }
});

module.exports = router;
