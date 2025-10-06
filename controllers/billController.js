const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");
const { rejects } = require("assert");
const { json } = require("stream/consumers");

const fetchAllBills = async (req, res) => {
  console.log("Fetch All Bills");

  const results = await new Promise((resolve, reject) => {
    db.query("SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` ORDER BY `invoice`.`date` DESC", (err, result) => {
      if (err) {
        console.error("Error fetching bills:", err);
        return reject(err);
      }

      resolve(result);
    });
  });

  if (results.length === 0) {
    return res.json("No Result");
  } else {
    // console.log(results);
    res.json(results);
  }
};

const ViewBill = (req, res) => {
  console.log("View Bill");
  res.sendFile(path.join(__dirname, "../public/bills/viewBill.html"));
}

module.exports = { fetchAllBills , ViewBill };
