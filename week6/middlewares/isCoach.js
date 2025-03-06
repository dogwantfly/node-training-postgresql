const FORBIDDEN_MESSAGE = '使用者尚未成為教練';
const PERMISSION_DENIED_STATUS_CODE = 401;

const generateError = (message) => {
  const error = new Error(message);
  error.status = PERMISSION_DENIED_STATUS_CODE;
  return error;
};

module.exports = async (req, res, next) => {
  try {
    const { role } = req.user;
    if (!role || role !== 'COACH') {
      throw generateError(FORBIDDEN_MESSAGE);
    }
    next();
  } catch (error) {
    res.status(error.status || PERMISSION_DENIED_STATUS_CODE).json({
      status: 'failed',
      message: error.message || FORBIDDEN_MESSAGE,
    });
  }
};
