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
  console.log("loginProcess");

  const data = req.body;
  let username = data.username;
  let password = data.password;

  db.query("SELECT * FROM `users`", (err, result) => {
    if (err) {
      console.error("Error fetching Users" + err);
      return res.status(500).json({error:"DB Error"});
    }
    console.log(result);
  });

  //   if (email == data.email && password == data.password) {
  //     req.session.email = data.email;
  //     res.send("success");
  //   } else {
  //     res.send("Invalid");
  //   }
};

module.exports = { login, getAllUsers };
