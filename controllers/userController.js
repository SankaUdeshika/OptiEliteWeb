const db = require("../db/db");
const path = require("path");

const getAllUsers = (req, res) => {
  console.log("working");
  res.sendFile(__dirname + "/public/index.html");
  // db.query("SELECT * FROM jobtype", (err, result) => {
  // if (err) {
  //   console.error("Error fetching users:", err);
  //   return res.status(500).json({ error: "DB error" });
  // }
  // res.json(result);
  // console.log(result);
  // });$
};

module.exports = { getAllUsers };
