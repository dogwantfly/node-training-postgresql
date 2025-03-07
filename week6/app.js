require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pinoHttp = require('pino-http');

const logger = require('./utils/logger')('App');
const creditPackageRouter = require('./routes/creditPackage');
const skillRouter = require('./routes/skill');
const userRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const coachRouter = require('./routes/coaches');
const courseRouter = require('./routes/courses');
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        req.body = req.raw.body;
        return req;
      },
      err: isProd
        ? () => ({ message: '伺服器錯誤' })
        : (err) => ({
            type: err.constructor.name,
            message: err.message,
            stack: err.stack,
            ...(err.errors && { details: err.errors }),
          }),
    },
    customLogLevel: function (res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    },
    customSuccessMessage: function (res) {
      if (res.statusCode === 404) return 'Resource not found';
      return 'Request completed';
    },
    customErrorMessage: function (error, res) {
      return isProd ? '伺服器錯誤' : error.message;
    },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/healthcheck', (req, res) => {
  res.status(200);
  res.send('OK');
});
app.use('/api/credit-package', creditPackageRouter);
app.use('/api/skill', skillRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/coaches', coachRouter);
app.use('/api/courses', courseRouter);

app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: '無此路由',
  });
  return;
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // 開發環境記錄完整錯誤
  if (!isProd) {
    req.log.error({
      err: {
        message: err.message,
        stack: err.stack,
        ...(err.errors && { details: err.errors }),
      },
    });
  } else {
    // 生產環境只記錄基本錯誤資訊
    req.log.error({
      err: {
        message: '伺服器錯誤',
        statusCode: err.status || 500,
      },
    });
  }

  const statusCode = err.status || 500;

  // 準備錯誤回應
  const errorResponse = {
    status: statusCode === 500 ? 'error' : 'failed',
    message: err.message || '伺服器錯誤',
  };

  // 開發環境下添加錯誤詳細資訊
  if (!isProd) {
    errorResponse.error = {
      type: err.constructor.name,
      message: err.message,
      stack: err.stack,
      ...(err.errors && { details: err.errors }),
    };
  } else {
    // 生產環境統一錯誤訊息
    errorResponse.message = '伺服器錯誤';
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = app;
