const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");

const fetchBranchDetails = async (req, res) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const todayDate = `${year}-${month}-${day}`;

  if (!req.session.username) {
    return res.send("no");
  }

  const username = req.session.username;
  const userIdParts = username.split("_");
  const userId = userIdParts[userIdParts.length - 1]; // ✅ Fix #1: always get last part

  try {
    // Step 1: Get branch users and location info
    const branchResults = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `branch_users` INNER JOIN `location` ON `branch_users`.`location_id` = `location`.`id` WHERE `users_id` = ?",
        [userId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

    // Step 2: Loop through each branch + query invoice stuff
    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          db.query(
            "SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` WHERE `customer`.`location_id` = ? AND `invoice`.`date` = ?",
            [branch.location_id, todayDate],
            (err2, result2) => {
              if (err2) return reject(err2);

              let estimated_total_sale = 0;
              let branch_OrderCount = result2.length;
              let total_branch_advance_payments = 0;
              let actual_total_profit = 0;
              let cash_collected = 0;

              for (let x = 0; x < result2.length; x++) {
                const invoice = result2[x];
                const statusId = String(invoice.payment_status_id); // ✅ Fix #4: safe type cast

                estimated_total_sale += invoice.total_price; // all orders estimate

                if (statusId === "1") {
                  // Pending: only advance paid
                  total_branch_advance_payments += invoice.advance_payment;
                  cash_collected += invoice.advance_payment;
                }

                if (statusId === "2") {
                  // Completed: full price collected
                  actual_total_profit += invoice.total_price;
                  cash_collected += invoice.total_price;
                }
              }

              const location_data = {
                location_id: branch.location_id,
                location_name: branch.location_name,
                branch_name: branch.branch_name,
                today: todayDate,
                this_month: month,
                order_count: branch_OrderCount,
                total_advance_payments: total_branch_advance_payments,
                total_profit: actual_total_profit,
                estimated_total_sale: estimated_total_sale, // ✅ Fix #2 & #3: renamed clearly
                total_cash_collected: cash_collected,
              };

              console.log(location_data);
              resolve(location_data);
            },
          );
        });
      }),
    );

    // Step 3: Send results back
    res.json({ locations: location_details });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetch_month_branch_details = async (req, res) => {

  // ✅ Fix #3: validate dateInput before using it
  const dateInput = req.body.dateInput;

  if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return res.status(400).json({ error: "Invalid or missing dateInput. Expected format: YYYY-MM-DD" });
  }

  const dateArray = dateInput.split("-"); // ✅ Fix #3: also fixed typo "dateArrya" → "dateArray"
  const year  = dateArray[0];
  const month = dateArray[1];
  const day   = dateArray[2];
  const todayDate = `${year}-${month}-${day}`;

  console.log(`${todayDate} is being processed`);

  if (!req.session.username) {
    return res.send("no");
  }

  const username = req.session.username;
  const userIdParts = username.split("_");
  const userId = userIdParts[userIdParts.length - 1]; // ✅ Fix #2: always grab last part

  try {
    // Step 1: Get branch users and location info
    const branchResults = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `branch_users` INNER JOIN `location` ON `branch_users`.`location_id` = `location`.`id` WHERE `users_id` = ?",
        [userId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

    // Step 2: Loop through each branch + query invoice stuff
    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          console.log(branch.location_id); // ✅ Fix #1: removed stray `9;`

          db.query(
            "SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` WHERE `customer`.`location_id` = ? AND `invoice`.`date` = ?",
            [branch.location_id, todayDate],
            (err2, result2) => {
              if (err2) return reject(err2);

              let estimated_total_sale = 0;
              let branch_order_count = result2.length;
              let total_branch_advance_payments = 0;
              let actual_total_profit = 0;
              let cash_collected = 0; // ✅ Fix #6: consistent naming

              for (let x = 0; x < result2.length; x++) {
                const invoice = result2[x];
                const statusId = String(invoice.payment_status_id); // ✅ Fix #5: safe type cast

                estimated_total_sale += invoice.total_price;

                if (statusId === "1") {
                  // Pending: only advance paid
                  total_branch_advance_payments += invoice.advance_payment;
                  cash_collected += invoice.advance_payment;
                }

                if (statusId === "2") {
                  // Completed: full price collected
                  actual_total_profit += invoice.total_price;
                  cash_collected += invoice.total_price;
                }
              }

              const location_data = {
                location_id: branch.location_id,
                location_name: branch.location_name,
                branch_name: branch.branch_name,
                today: todayDate,
                this_month: month,
                order_count: branch_order_count,
                total_advance_payments: total_branch_advance_payments,
                total_profit: actual_total_profit,
                estimated_total_sale: estimated_total_sale, // ✅ Fix #4: typo fixed
                total_cash_collected: cash_collected,
              };

              console.log(location_data);
              resolve(location_data);
            },
          );
        });
      }),
    );

    // Step 3: Send results back
    res.json({ locations: location_details });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getBranchLocation = async (req, res) => {
  console.log("getBranchLocation function called");

  try {
    const result = await new Promise((resolve, reject) => {  // ← 'resolve', not 'promise'
      db.query("SELECT * FROM location", [], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
    res.json(result);
  } catch (err) {
    console.error("Error fetching branch locations:", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

module.exports = {
  fetchBranchDetails,
  fetch_month_branch_details,
  getBranchLocation,
};
