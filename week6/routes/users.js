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
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確',
      });
      return;
    }
    if (isNotValidPassword(password)) {
      logger.warn(
        '建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
      );
      res.status(400).json({
        status: 'failed',
        message:
          '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字',
      });
      return;
    }
    const userRepository = dataSource.getRepository('User');
    // 檢查 email 是否已存在
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      logger.warn('建立使用者錯誤: Email 已被使用');
      res.status(409).json({
        status: 'failed',
        message: 'Email 已被使用',
      });
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

module.exports = router;
