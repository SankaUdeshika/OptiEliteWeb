const getAppDb = require("../db/appDb");

const fetchBranchDetails = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside

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
  const userId = userIdParts[userIdParts.length - 1];
  

  try {
    const branchResults = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `branch_users` INNER JOIN `location` ON `branch_users`.`location_id` = `location`.`id` WHERE `users_id` = ?",
        [userId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

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
                const statusId = String(invoice.payment_status_id);

                estimated_total_sale += invoice.total_price;

                if (statusId === "1") {
                  total_branch_advance_payments += invoice.advance_payment;
                  cash_collected += invoice.advance_payment;
                }

                if (statusId === "2") {
                  actual_total_profit += invoice.total_price;
                  cash_collected += invoice.total_price;
                }
              }

              resolve({
                location_id: branch.location_id,
                location_name: branch.location_name,
                branch_name: branch.branch_name,
                today: todayDate,
                this_month: month,
                order_count: branch_OrderCount,
                total_advance_payments: total_branch_advance_payments,
                total_profit: actual_total_profit,
                estimated_total_sale: estimated_total_sale,
                total_cash_collected: cash_collected,
              });
            }
          );
        });
      })
    );

    db.end(); // ✅ close after all queries done
    res.json({ locations: location_details });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetch_month_branch_details = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside

  const dateInput = req.body.dateInput;

  if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return res.status(400).json({ error: "Invalid or missing dateInput. Expected format: YYYY-MM-DD" });
  }

  const dateArray = dateInput.split("-");
  const year  = dateArray[0];
  const month = dateArray[1];
  const day   = dateArray[2];
  const todayDate = `${year}-${month}-${day}`;

  if (!req.session.username) {
    return res.send("no");
  }

  const username = req.session.username;
  const userIdParts = username.split("_");
  const userId = userIdParts[userIdParts.length - 1];

  try {
    const branchResults = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `branch_users` INNER JOIN `location` ON `branch_users`.`location_id` = `location`.`id` WHERE `users_id` = ?",
        [userId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          db.query(
            "SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` WHERE `customer`.`location_id` = ? AND `invoice`.`date` = ?",
            [branch.location_id, todayDate],
            (err2, result2) => {
              if (err2) return reject(err2);

              let estimated_total_sale = 0;
              let branch_order_count = result2.length;
              let total_branch_advance_payments = 0;
              let actual_total_profit = 0;
              let cash_collected = 0;

              for (let x = 0; x < result2.length; x++) {
                const invoice = result2[x];
                const statusId = String(invoice.payment_status_id);

                estimated_total_sale += invoice.total_price;

                if (statusId === "1") {
                  total_branch_advance_payments += invoice.advance_payment;
                  cash_collected += invoice.advance_payment;
                }

                if (statusId === "2") {
                  actual_total_profit += invoice.total_price;
                  cash_collected += invoice.total_price;
                }
              }

              resolve({
                location_id: branch.location_id,
                location_name: branch.location_name,
                branch_name: branch.branch_name,
                today: todayDate,
                this_month: month,
                order_count: branch_order_count,
                total_advance_payments: total_branch_advance_payments,
                total_profit: actual_total_profit,
                estimated_total_sale: estimated_total_sale,
                total_cash_collected: cash_collected,
              });
            }
          );
        });
      })
    );

    db.end(); // ✅ close after all queries done
    res.json({ locations: location_details });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const getBranchLocation = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  console.log("getBranchLocation function called");

  try {
    const result = await new Promise((resolve, reject) => {
      db.query("SELECT * FROM location", [], (err, result) => {
        db.end(); // ✅ close after query
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