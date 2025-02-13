require("dotenv").config()
const http = require("http")
const AppDataSource = require("./db")

function isUndefined (value) {
  return value === undefined
}

function isNotValidString (value) {
  return typeof value !== "string" || value.trim().length === 0 || value === ""
}

function isNotValidInteger (value) {
  return typeof value !== "number" || value < 0 || value % 1 !== 0
}
const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
const headers = {
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, POST, GET, OPTIONS,DELETE",
  "Content-Type": "application/json"
}
const sendResponse = (res, statusCode, payload, headers = headers) => {
  res.writeHead(statusCode, headers)
  res.end(JSON.stringify(payload))
}

const requestListener = async (req, res) => {
  let body = ""
  req.on("data", (chunk) => {
    body += chunk
  })

  if (req.url === "/api/credit-package" && req.method === "GET") {
    try {
      const packages = await AppDataSource.getRepository("CreditPackage").find({
        select: ["id", "name", "credit_amount", "price"]
      })
      sendResponse(res, 200, {
        status: "success",
        data: packages
      }, headers)
    } catch (error) {
      sendResponse(res, 500, {
        status: "error",
        message: "伺服器錯誤"
      }, headers)
    }
  } else if (req.url === "/api/credit-package" && req.method === "POST") {
    req.on("end", async () => {
      try {
        const data = JSON.parse(body)
        if (isUndefined(data.name) || isNotValidString(data.name) ||
                isUndefined(data.credit_amount) || isNotValidInteger(data.credit_amount) ||
                isUndefined(data.price) || isNotValidInteger(data.price)) {
          sendResponse(res, 400, {
            status: "failed",
            message: "欄位未填寫正確"
          }, headers)
          return
        }
        const creditPackageRepo = await AppDataSource.getRepository("CreditPackage")
        const existPackage = await creditPackageRepo.find({
          where: {
            name: data.name
          }
        })
        if (existPackage.length > 0) {
          sendResponse(res, 409, {
            status: "failed",
            message: "資料重複"
          }, headers)
          return
        }
        const newPackage = await creditPackageRepo.create({
          name: data.name,
          credit_amount: data.credit_amount,
          price: data.price
        })
        const result = await creditPackageRepo.save(newPackage)
        sendResponse(res, 200, {
          status: "success",
          data: result
        }, headers)
      } catch (error) {
        sendResponse(res, 500, {
          status: "error",
          message: "伺服器錯誤"
        }, headers)
      }
    })
  } else if (req.url.startsWith("/api/credit-package") && req.method === "DELETE") {
    try {
      const packageId = req.url.split("/").pop()
      if (isUndefined(packageId) || isNotValidString(packageId)) {
        sendResponse(res, 400, {
          status: "failed",
          message: "ID錯誤"
        }, headers)
        return
      }
      const result = await AppDataSource.getRepository("CreditPackage").delete(packageId)
      if (result.affected === 0) {
        sendResponse(res, 400, {
          status: "failed",
          message: "ID錯誤"
        }, headers)
        return
      }
      sendResponse(res, 200, {
        status: "success"
      }, headers)
    } catch (error) {
      sendResponse(res, 500, {  
        status: "error",
        message: "伺服器錯誤"
      }, headers)
    }
  } else if (req.url === "/api/coaches/skill" && req.method === "GET") {
    try {
      const skills = await AppDataSource.getRepository("Skill").find({
        select: ["id", "name"]
      })
      sendResponse(res, 200, {
        status: "success",
        data: skills
      }, headers)
      res.end()
    } catch (error) {
      sendResponse(res, 500, {
        status: "error",
        message: "伺服器錯誤"
      }, headers)
    }
  } else if (req.url === "/api/coaches/skill" && req.method === "POST") {
    req.on("end", async () => {
      try {
        const data = JSON.parse(body)
        if (isUndefined(data.name) || isNotValidString(data.name)) {          
          sendResponse(res, 400, {
            status: "failed",
            message: "欄位未填寫正確"
          }, headers)
          return
        }
        const skillRepo = await AppDataSource.getRepository("Skill")
        const existSkill = await skillRepo.find({
          where: {
            name: data.name
          }
        })
        if (existSkill.length > 0) {          
          sendResponse(res, 409, {
            status: "failed",
            message: "資料重複"
          }, headers)
          return
        }
        const newSkill = await skillRepo.create({
          name: data.name
        })
        const result = await skillRepo.save(newSkill)
        sendResponse(res, 200, {
          status: "success",
          data: result
        }, headers)
      } catch (error) {
        sendResponse(res, 500, {
          status: "error",
          message: "伺服器錯誤"
        }, headers)
      }
    })
  } else if (req.url.startsWith("/api/coaches/skill") && req.method === "DELETE") {
    try {
      const skillId = req.url.split("/").pop()
      if (isUndefined(skillId) || isNotValidString(skillId) || !isValidUUID(skillId)) {        
        sendResponse(res, 400, {
          status: "failed",
          message: "ID 錯誤"
        }, headers)
        return
      }
      const result = await AppDataSource.getRepository("Skill").delete(skillId)
      if (result.affected === 0) {
        sendResponse(res, 400, {
          status: "failed",
          message: "ID 錯誤"          
        }, headers)
        return
      }
      sendResponse(res, 200, {
        status: "success"
      }, headers)
    } catch (error) {
      sendResponse(res, 500, {  
        status: "error",
        message: "伺服器錯誤"
      }, headers)
    }
  } else if (req.method === "OPTIONS") {
    sendResponse(res, 200, {}, headers)
  } else {
    sendResponse(res, 404, {
      status: "failed",
      message: "無此網站路由",
    }, headers)
  }
}

const server = http.createServer(requestListener)

async function startServer() {
  await AppDataSource.initialize()
  console.log("資料庫連接成功")
  server.listen(process.env.PORT)
  console.log(`伺服器啟動成功, port: ${process.env.PORT}`)
  return server;
}

module.exports = startServer();
