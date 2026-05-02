const getAppDb = require("../db/appDb");
const getUserDb = require("../db/userDb"); 


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

  const UserDb = getUserDb(); // ✅ fresh connection each login

  UserDb.query(
    "SELECT * FROM `users` WHERE `user-name` = ? AND `password` = ? AND `user_status_status_id` = ?",
    [username, password, statusID],
    (err, result) => {
      UserDb.end(); // ✅ close after query
      if (err) {
        console.error("Error fetching users: " + err);
        return res.status(500).json({ error: "DB Error" });
      }

      if (result.length === 0) {
        return res.send("Invalid");
      }

      const user = result[0];

      const db2 = getAppDb(user.db_name);
      db2.query(
        "SELECT * FROM `users` INNER JOIN `location` ON `location`.`id` = `users`.`location_id` WHERE `username` = ? AND `password` = ?",
        [username, password],
        (err, userResults) => {
          db2.end();
          if (err) {
            console.error("Error fetching user details: " + err);
            return res.status(500).json({ error: "DB Error" });
          }

          if (userResults.length === 0) {
            return res.send("Invalid");
          }

          console.log("MEka thama DB NAME eka:"+user.db_name);

          req.session.user = {
            id: userResults[0].id,
            username: user["user-name"],
            db_name: user["db_name"],
            fname: userResults[0].fname,
            lname: userResults[0].lname,
            email: userResults[0].email,
            password: userResults[0].password,
            location_id: userResults[0].location_id,
            location_name : userResults[0].location_name,
          };

          req.session.username = data.username;
          req.session.db_name = result[0].db_name;

          const db = getAppDb(result[0].db_name);
          db.query("SELECT * FROM `location`", (err, branchLocations) => {
            db.end();
            if (err) {
              console.error("Error fetching branch data: " + err);
              return res.status(500).json({ error: "DB Error" });
            }
            return res.send(branchLocations);
          });
        }
      );
    }
  );
};

const updateUserLocation = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);
  try {
    db.query(
      "UPDATE `users` SET `location_id` = ? WHERE `id` = ?",
      [req.body.location_id, req.session.user.id],
      (err, result) => {
        db.end();
        if (err) {
          console.error("Error updating user location: " + err);
          return res.status(500).json({ error: "DB Error" });
        }
        return res.json({ success: true, message: "Location updated successfully" }); // ✅ only here
      }
    );
    // ❌ removed duplicate res.json() that was here
  } catch (error) {
    console.error("Error updating user location: " + error);
    res.status(500).json({ error: "DB Error" });
  }
};

const getUserDetails = (req, res) => {
  const UserObject = req.session.user;
  if (UserObject) {
    return res.json({
      id: UserObject.id,
      username: UserObject.username,
      fname: UserObject.fname,
      lname: UserObject.lname,
      email: UserObject.email,
      location_id: UserObject.location_id,
      location_name : UserObject.location_name,
    }); 
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { login, getAllUsers, updateUserLocation, getUserDetails };