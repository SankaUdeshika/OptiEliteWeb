const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345678", // or your password
  database: "optielite_users",
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Connected");
});

module.exports = db;
