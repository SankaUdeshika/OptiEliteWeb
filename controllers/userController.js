const { error } = require("console");
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

const login = (req, res) => {
  const data = req.body;
  let username = data.username;
  let password = data.password;
  let statusID = 1;
  db.query(
    "SELECT * FROM `users` WHERE `username` = ? AND `password` = ? AND `user_status_status_id` = ? ",
    [username, password, statusID],
    (err, result) => {
      if (err) {
        console.error("Error fetching users: " + err);
        return res.status(500).json({ error: "DB Error" });
      }

      if (result.length > 0) {
        req.session.username = data.username + "_" + result[0].id;
        console.log("success " + req.session.username);
        res.send("success");
      } else {
        console.log("invalid");
        res.send("Invalid");
      }
    }
  );
};

module.exports = { login, getAllUsers };
