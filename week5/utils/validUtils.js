const moment = require('moment')

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

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
function isNotValidEmail (value) {
  return typeof value !== 'string' || !emailRegex.test(value)
}

const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
function isNotValidPassword (value) {
  return typeof value !== 'string' || !passwordRegex.test(value)
}

function isNotValidDate (value) {
  return typeof value !== 'string' || moment(value).isValid() === false
}


module.exports = {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUuid,
  isNotValidEmail,
  isNotValidPassword,
  isNotValidDate
}