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

        const db = getAppDb(result[0].db_name); // ✅ get DB connection for this user
        db.query("SELECT * FROM `location`", (err, branchLocations) => {
          if (err) {
            console.error("Error fetching branch data: " + err);
            return res.status(500).json({ error: "DB Error" });
          }  
          res.send(branchLocations);
        });
      } else {
        res.send("Invalid");
      }
    },
  );
};

const updateUserLocation = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  try {
    db.query(
      "UPDATE `users` SET `location_id` = ? WHERE `id` = ?",
      [req.body.location_id, req.session.user.id],
      (err, result) => {
        if (err) {
          console.error("Error updating user location: " + err);
          return res.status(500).json({ error: "DB Error" });
        }
        res.json({ success: true, message: "Location updated successfully" });
      }
    );
  } catch (error) {
    console.error("Error updating user location: " + error);
    res.status(500).json({ error: "DB Error" });
  }
}

module.exports = { login, getAllUsers, updateUserLocation };
