function isUndefined (value) {
  return value === undefined
}

function isNotValidString (value) {
  return typeof value !== 'string' || value.trim().length === 0 || value === ''
}

function isNotValidInteger (value) {
  return typeof value !== 'number' || value < 0 || value % 1 !== 0
}

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
function isNotValidUuid (value) {
  return typeof value !== 'string' || !uuidRegex.test(value)
}

module.exports = {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUuid
}