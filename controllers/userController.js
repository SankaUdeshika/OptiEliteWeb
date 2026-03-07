const getAppDb = require("../db/appDb");
const UserDb = require("../db/userDb");

const getAllUsers = (req, res) => {
  console.log("working");
  res.sendFile(__dirname + "/public/index.html");
};

// Login with optielite User Database
const login = (req, res) => {
  const data = req.body;
  let username = data.username;
  let password = data.password;
  let statusID = 1;

  UserDb.query(
    "SELECT * FROM `users` WHERE `user-name` = ? AND `password` = ? AND `user_status_status_id` = ?",
    [username, password, statusID],
    (err, result) => {
      if (err) {
        console.error("Error fetching users: " + err);
        return res.status(500).json({ error: "DB Error" });
      }

      if (result.length > 0) {
        const user = result[0];

        // ✅ Store all user info in session on login
        req.session.user = {
          id: user.id,
          username: user["user-name"],
          db_name: user.db_name,
        };

        req.session.username = data.username + "_" + result[0].id;
        req.session.db_name = result[0].db_name;

        res.send("success");
      } else {
        res.send("Invalid");
      }
    }
  );
};

module.exports = { login, getAllUsers };