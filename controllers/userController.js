const { error } = require("console");
const db = require("../db/db");
const UserDb = require("../db/user_db");
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


// Login with optielite User Database
const login = (req, res) => {
  const data = req.body;
  let username = data.username;
  let password = data.password;

  let statusID = 1;
  
  UserDb.query(
    "SELECT * FROM `users` WHERE `user-name` = ? AND `password` = ? AND `user_status_status_id` = ? ",
    [username, password, statusID],
    (err, result) => {
      if (err) {
        console.error("Error fetching users: " + err);
        return res.status(500).json({ error: "DB Error" });
      }

      if (result.length > 0) {
        req.session.username = data.username + "_" + result[0].id;
        req.session.location_Id = result[0].location_id;
        console.log("Session after login Locations:" + req.session.location_Id);
        res.send("success");
      } else {
        console.log("invalid");
        res.send("Invalid");
      }
    }
  );
};

module.exports = { login, getAllUsers };
