const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");

const fetchBranchDetails = async (req, res) => {
  const bodydata = req.body;

  if (!req.session.username) {
    return res.send("no");
  }

  const username = req.session.username;
  const userIdParts = username.split("_");
  const userId = userIdParts[1];

  const date = new Date();
  const today = date.getDate();
  const thisMonth = date.getMonth() + 1;

  try {
    // Step 1: Get branch users and location info
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

    // Step 2: Loop through each branch + query invoice stuff
    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          db.query(
            "SELECT * FROM `invoice` INNER JOIN `invoice_item` ON `invoice_item`.`invoice_id` = `invoice`.`invoice_id` INNER JOIN `stock` ON `stock`.`id` = `invoice_item`.`stock_id` WHERE `stock`.`location_id` = ?",
            [branch.location_id],
            (err2, result2) => {
              if (err2) return reject(err2);

              let estimate_branch_totalPrice = 0;
              let branch_OrderCount = result2.length;
              let total_branch_advance_payments = 0;
              let actual_total_profit = 0;

              for (let x = 0; x < result2.length; x++) {
                estimate_branch_totalPrice += result2[x].total_price;
                if (result2[x].payment_status_id == "1") {
                  total_branch_advance_payments += result2[x].advance_payment;
                }
                if (result2[x].payment_status_id == "2") {
                  actual_total_profit +=
                    result2[x].total_price + total_branch_advance_payments;
                }
              }

              const location_data = {
                location_id: branch.location_id,
                location_name: branch.location_name,
                branch_name: branch.branch_name,
                today: today,
                this_month: thisMonth,
                order_count: branch_OrderCount,
                total_advance_payments: total_branch_advance_payments,
                total_profit: actual_total_profit,
                astimate_total_profit: estimate_branch_totalPrice,
              };
              console.log(location_data);
              resolve(location_data);
            }
          );
        });
      })
    );

    // Step 3: Send results back
    res.json({ locations: location_details });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { fetchBranchDetails };
