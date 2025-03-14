const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackageController')
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUuid,
} = require('../utils/validUtils');
const appError = require('../utils/appError');

async function getAll (req, res, next) {
  const creditPackages = await dataSource
    .getRepository('CreditPackage')
    .find({
      select: ['id', 'name', 'credit_amount', 'price'],
    });
  res.status(200).json({
    status: 'success',
    data: creditPackages,
  });
}

async function post (req, res, next) {
  const { name, credit_amount: creditAmount, price } = req.body;
  if (
    isUndefined(name) ||
    isNotValidString(name) ||
    isUndefined(creditAmount) ||
    isNotValidInteger(creditAmount) ||
    isUndefined(price) ||
    isNotValidInteger(price)
  ) {
    logger.warn('欄位未填寫正確');
    next(appError(400, '欄位未填寫正確'));
    return;
  }
  const creditPackageRepo = dataSource.getRepository('CreditPackage');
  const existCreditPackage = await creditPackageRepo.findOne({
    where: {
      name,
    },
  });
  if (existCreditPackage) {
    logger.warn('新增 credit package 錯誤: 資料重複');
    next(appError(409, '資料重複'));
    return;
  }
  const newCreditPackage = await creditPackageRepo.create({
    name,
    credit_amount: creditAmount,
    price,
  });
  const result = await creditPackageRepo.save(newCreditPackage);
  res.status(200).json({
    status: 'success',
    data: result,
  });
}

async function postUserBuy (req, res, next) {
  const { id } = req.user;
  const { creditPackageId } = req.params;
  if (isNotValidUuid(id) || isNotValidUuid(creditPackageId)) {
    logger.warn('使用者或 credit package id 格式不正確');
    next(appError(400, '使用者或 credit package id 格式不正確'));
    return;
  }
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
}

async function deletePackage (req, res, next) {
  try {
    const { creditPackageId } = req.params
    if (isUndefined(creditPackageId) || isNotValidString(creditPackageId)) {
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
      return
    }
    const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
    if (result.affected === 0) {
      res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
      return
    }
    res.status(200).json({
      status: 'success',
      data: result
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

module.exports = {
  getAll,
  post,
  postUserBuy,
  deletePackage
}
