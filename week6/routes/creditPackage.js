const express = require('express');

const router = express.Router();
const config = require('../config/index');
const { dataSource } = require('../db/data-source');
const logger = require('../utils/logger')('CreditPackage');
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger,
});

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
} = require('../utils/validUtils');
const appError = require('../utils/appError');

router.get('/', async (req, res, next) => {
  try {
    const packages = await dataSource.getRepository('CreditPackage').find({
      select: ['id', 'name', 'credit_amount', 'price', 'createdAt'],
    });
    res.status(200).json({
      status: 'success',
      data: packages,
    });
  } catch (error) {
    logger.error('取得 credit package 錯誤', error);
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, credit_amount, price } = req.body;
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      isUndefined(credit_amount) ||
      isNotValidInteger(credit_amount) ||
      isUndefined(price) ||
      isNotValidInteger(price)
    ) {
      logger.warn('欄位未填寫正確');
      next(appError(400, '欄位未填寫正確'));
      return;
    }
    const creditPackageRepo = await dataSource.getRepository('CreditPackage');
    const existPackage = await creditPackageRepo.find({
      where: {
        name,
      },
    });
    if (existPackage.length > 0) {
      logger.warn('新增 credit package 錯誤: 資料重複');
      res.status(409).json({
        status: 'failed',
        message: '資料重複',
      });
      return;
    }
    const newPackage = await creditPackageRepo.create({
      name,
      credit_amount,
      price,
    });
    const result = await creditPackageRepo.save(newPackage);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    logger.error('新增 credit package 錯誤', error);
    next(error);
  }
});

router.post('/:creditPackageId', auth, async (req, res, next) => {
  try {
    const { id } = req.user;
    const { creditPackageId } = req.params;
    const creditPackageRepo = dataSource.getRepository('CreditPackage');
    const creditPackage = await creditPackageRepo.findOne({
      where: {
        id: creditPackageId,
      },
    });
    if (!creditPackage) {
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase');
    const newPurchase = await creditPurchaseRepo.create({
      user_id: id,
      credit_package_id: creditPackageId,
      purchased_credits: creditPackage.credit_amount,
      price_paid: creditPackage.price,
      purchaseAt: new Date().toISOString(),
    });
    await creditPurchaseRepo.save(newPurchase);
    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
});

router.delete('/:creditPackageId', async (req, res, next) => {
  try {
    const { creditPackageId } = req.params;
    console.log(creditPackageId);
    if (isUndefined(creditPackageId) || isNotValidString(creditPackageId)) {
      logger.warn('ID 錯誤');
      next(appError(400, 'ID 錯誤'));
      return;
    }
    const result = await dataSource
      .getRepository('CreditPackage')
      .delete(creditPackageId);

    if (result.affected === 0) {
      logger.warn('ID 錯誤');
      next(appError(400, 'ID 錯誤'));
      return;
    }
    res.status(200).json({
      status: 'success',
    });
  } catch (error) {
    logger.error('刪除 credit package 錯誤', error);
    next(error);
  }
});

module.exports = router;
