const express = require('express')
const cors = require('cors')
const path = require('path')
const pinoHttp = require('pino-http')

const logger = require('./utils/logger')('App')
const creditPackageRouter = require('./routes/creditPackage')
const skillRouter = require('./routes/skill')
const usersRouter = require('./routes/users')
const adminRouter = require('./routes/admin')
const coachRouter = require('./routes/coaches')
const coursesRouter = require('./routes/courses')
const uploadRouter = require('./routes/upload')
const isProd = process.env.NODE_ENV === 'production';

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(pinoHttp({
  logger,
  serializers: {
    req (req) {
      req.body = req.raw.body
      return req
    }
  }
}))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/healthcheck', (req, res) => {
  res.status(200)
  res.send('OK')
})
app.use('/api/credit-package', creditPackageRouter)
app.use('/api/coaches/skill', skillRouter)
app.use('/api/users', usersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/coaches', coachRouter)
app.use('/api/courses', coursesRouter)
app.use('/api/upload', uploadRouter)

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  // 開發環境記錄完整錯誤
  if (!isProd) {
    req.log.error({
      err: {
        type: err.constructor.name,
        code: err.code,
        message: err.message,
        stack: err.stack,
        ...(err.errors && { details: err.errors }),
      },
    });
  } else {
    // 生產環境只記錄基本錯誤資訊
    req.log.error({
      err: {
        message: statusCode === 500 ? '伺服器錯誤' : err.message,
        statusCode: statusCode,
        code: err.code,
      },
    });
  }

  const errorResponse = {
    status: statusCode === 500 ? 'error' : 'failed',
    message: err.message || '伺服器錯誤',
  };

  if (!isProd) {
    errorResponse.error = {
      type: err.constructor.name,
      code: err.code,
      message: err.message,
      stack: err.stack,
      ...(err.errors && { details: err.errors }),
    };
  } else if (statusCode === 500) {
    errorResponse.message = '伺服器錯誤';
  }

  res.status(statusCode).json(errorResponse);
});

module.exports = app
