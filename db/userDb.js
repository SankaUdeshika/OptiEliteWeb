// db/userDb.js
const mysql = require("mysql2");

function getUserDb() {
  const db = mysql.createConnection({
    // host: "31.97.61.250", // VpS host
    // user: "sanka", // VPS username
    // password: "Sanka123!@", // VPS password
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "optielite_users",
  });

  db.connect((err) => {
    if (err) throw err;
    console.log("✅ Connected to: optielite_users");
  });

  return db;
}

module.exports = getUserDb;
