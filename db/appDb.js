// db/appDb.js
const mysql = require("mysql2");

function getAppDb(dbName) {
  const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: dbName, // ✅ dynamic per user
  });

  db.connect((err) => {
    if (err) throw err;
    console.log(`✅ Connected to: ${dbName}`);
  });

  return db;
}

module.exports = getAppDb;