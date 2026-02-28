const mysql = require("mysql2");

const db = mysql.createConnection({
  // host: "31.97.61.250", // VpS host
  // user: "sanka", // VPS username
  // password: "Sanka123!@", // VPS password
  host: "localhost", // localhost host
  user: "root", // localhost username
  password: "12345678", // localhost password
  database: "optielite_users",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Connected");
});

module.exports = db;
