// db/appDb.js
const mysql = require("mysql2");

function getAppDb(dbName) {
  const db = mysql.createConnection({
    host: "31.97.61.250", // VpS host
    user: "sanka", // VPS username
    password: "Sanka123!@", // VPS password
    // host: "localhost",
    // user: "root",
    // password: "12345678",
    database: dbName, // ✅ dynamic per user
  });

  db.connect((err) => {
    if (err) throw err;
    console.log(`✅ Connected to: ${dbName}`);
  });

  return db;
}

module.exports = getAppDb;
