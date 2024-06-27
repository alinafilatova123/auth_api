const mysql = require('mysql2/promise')
const dotenv = require('dotenv')
dotenv.config()

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB
})

module.exports = pool;