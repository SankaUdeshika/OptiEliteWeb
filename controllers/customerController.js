const getAppDb = require("../db/appDb");

const getCustomerbyMobile = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const NameOrMobile = req.body.mobileOrName;

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `customer` WHERE `mobile` LIKE ? OR `name` LIKE ?",
        [`%${NameOrMobile}%`, `%${NameOrMobile}%`],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching customer by mobile:", error);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

const getAllCustomer = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `customer` INNER JOIN `location` ON `customer`.`location_id` = `location`.`id` INNER JOIN `gender` ON `customer`.`gender_gender_id` = `gender`.`gender_id`",
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching all customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

const addnewCustomer = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const UserObject = req.session.user;



  const {
    name,
    gender,
    location_name,
    address,
    mobile1,
    mobile2,
    landline,
    birthday,
    nic,
    email,
  } = req.body;

   const Userlocation_id = UserObject.location_id;

  try {
    const result = await new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO customer (
          name, gender_gender_id, location_id, address_line1,
          mobile, mobile2, telephone_land, birthday, nic, email, register_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

      const values = [
        name,
        gender,
        Userlocation_id,
        address,
        mobile1,
        mobile2,
        landline,
        birthday,
        nic,
        email,
      ];

      db.query(sql, values, (err, result) => {
        db.end();
        if (err) return reject(err);
        resolve(result);
      });
    });

    res
      .status(200)
      .json({ message: "Customer added successfully", data: result });
  } catch (error) {
    console.error("Error adding new customer:", error);
    res
      .status(500)
      .json({ error: "Failed to insert customer", details: error.message });
  }
};

module.exports = {
  getCustomerbyMobile,
  getAllCustomer,
  addnewCustomer,
};
