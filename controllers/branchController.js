const getAppDb = require("../db/appDb");

const fetchBranchDetails = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);

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
        },
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          // Query 1: Get payments grouped by payment method (like Java code)
          db.query(
            `SELECT 
              pm.payment_name,
              SUM(aph.paid_amount) as total_paid
             FROM advance_payment_history aph
             INNER JOIN payment_method pm ON pm.Payment_id = aph.payment_method
             WHERE aph.date = ? 
             AND aph.location_id = ?
             GROUP BY pm.payment_name`,
            [todayDate, branch.location_id],
            (err1, paymentResults) => {
              if (err1) return reject(err1);

              let cashCollection = 0;
              let cardCollection = 0;
              let onlinePaymentCollection = 0;
              let totalSellingCollection = 0;

              // Process payment collections by method
              for (let payment of paymentResults) {
                const amount = parseFloat(payment.total_paid) || 0;

                if (payment.payment_name === "Cash") {
                  cashCollection = amount;
                } else if (payment.payment_name === "Card") {
                  cardCollection = amount;
                } else if (payment.payment_name === "Online Bank Transfer") {
                  onlinePaymentCollection = amount;
                }

                totalSellingCollection += amount;
              }

              // Query 2: Get Total Sale from invoice subtotal (like Java code)
              db.query(
                `SELECT SUM(subtotal) as total_subtotal 
                 FROM invoice 
                 WHERE date = ? 
                 AND invoice_location = ?`,
                [todayDate, branch.location_id],
                (err2, invoiceResults) => {
                  if (err2) return reject(err2);

                  let TotalSale = 0;
                  if (
                    invoiceResults.length > 0 &&
                    invoiceResults[0].total_subtotal
                  ) {
                    TotalSale = parseFloat(invoiceResults[0].total_subtotal);
                  }

                  // You need to get total_expenses from somewhere (like reportmap in Java)
                  // For now, I'll assume you have a way to get this
                  const total_expenses = 0; // TODO: Fetch from your expenses table
                  const BankDeposit = cashCollection - total_expenses;

                  // Query 3: Get order count and other metrics
                  db.query(
                    `SELECT 
                      i.*,
                      c.mobile
                     FROM invoice i
                     INNER JOIN customer c ON c.mobile = i.customer_mobile
                     WHERE c.location_id = ? 
                     AND i.date = ?`,
                    [branch.location_id, todayDate],
                    (err3, invoiceDetails) => {
                      if (err3) return reject(err3);

                      let branch_OrderCount = invoiceDetails.length;
                      let total_advance_payments = 0;
                      let actual_total_profit = 0;

                      for (let invoice of invoiceDetails) {
                        const statusId = String(invoice.payment_status_id);

                        if (statusId === "1") {
                          total_advance_payments +=
                            parseFloat(invoice.advance_payment) || 0;
                        }

                        if (statusId === "2") {
                          actual_total_profit +=
                            parseFloat(invoice.total_price) || 0;
                        }
                      }

                      resolve({
                        location_id: branch.location_id,
                        location_name: branch.location_name,
                        branch_name: branch.branch_name,
                        today: todayDate,
                        this_month: month,

                        // Payment collections by method (matches Java output)
                        cashCollection: cashCollection,
                        cardCollection: cardCollection,
                        onlinePaymentCollection: onlinePaymentCollection,
                        totalSellingCollection: totalSellingCollection,
                        BankDeposit: BankDeposit,
                        TotalSale: TotalSale,

                        // Additional metrics
                        order_count: branch_OrderCount,
                        total_advance_payments: total_advance_payments,
                        actual_total_profit: actual_total_profit,
                        total_cash_collected:
                          cashCollection +
                          cardCollection +
                          onlinePaymentCollection,
                      });
                    },
                  );
                },
              );
            },
          );
        });
      }),
    );

    db.end();
    res.json({ locations: location_details });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetch_month_branch_details = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);

  const dateInput = req.body.dateInput;

  if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return res.status(400).json({
      error: "Invalid or missing dateInput. Expected format: YYYY-MM-DD",
    });
  }

  const dateArray = dateInput.split("-");
  const year = dateArray[0];
  const month = dateArray[1];
  const day = dateArray[2];
  const selectedDate = `${year}-${month}-${day}`;

  // Get first and last day of the month for monthly query
  const firstDayOfMonth = `${year}-${month}-01`;
  const lastDayOfMonth = new Date(year, month, 0).toISOString().split("T")[0];

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
        },
      );
    });

    if (branchResults.length === 0) {
      return res.json("No Result");
    }

    const location_details = await Promise.all(
      branchResults.map((branch) => {
        return new Promise((resolve, reject) => {
          // Query 1: Get monthly payments grouped by payment method (matches Java logic)
          db.query(
            `SELECT 
              pm.payment_name,
              SUM(aph.paid_amount) as total_paid
             FROM advance_payment_history aph
             INNER JOIN payment_method pm ON pm.Payment_id = aph.payment_method
             WHERE aph.date BETWEEN ? AND ?
             AND aph.location_id = ?
             GROUP BY pm.payment_name`,
            [firstDayOfMonth, lastDayOfMonth, branch.location_id],
            (err1, paymentResults) => {
              if (err1) return reject(err1);

              let cashCollection = 0;
              let cardCollection = 0;
              let onlinePaymentCollection = 0;
              let totalSellingCollection = 0;

              // Process payment collections by method for the month
              for (let payment of paymentResults) {
                const amount = parseFloat(payment.total_paid) || 0;

                if (payment.payment_name === "Cash") {
                  cashCollection = amount;
                } else if (payment.payment_name === "Card") {
                  cardCollection = amount;
                } else if (payment.payment_name === "Online Bank Transfer") {
                  onlinePaymentCollection = amount;
                }

                totalSellingCollection += amount;
              }

              // Query 2: Get Total Sale from invoice subtotal for the month (matches Java logic)
              db.query(
                `SELECT SUM(subtotal) as total_subtotal 
                 FROM invoice 
                 WHERE date = ?
                 AND invoice_location = ?`,
                [selectedDate, branch.location_id],
                (err2, invoiceResults) => {
                  if (err2) return reject(err2);

                  let TotalSale = 0;
                  if (
                    invoiceResults.length > 0 &&
                    invoiceResults[0].total_subtotal
                  ) {
                    TotalSale = parseFloat(invoiceResults[0].total_subtotal);
                  }

                  // TODO: Get total_expenses for the month from your expenses table
                  const total_expenses = 0; // Replace with actual monthly expenses query
                  const BankDeposit = cashCollection - total_expenses;

                  // Query 3: Get monthly invoice details for additional metrics
                  db.query(
                    `SELECT 
                      i.*,
                      c.mobile
                     FROM invoice i
                     INNER JOIN customer c ON c.mobile = i.customer_mobile
                     WHERE c.location_id = ? 
                     AND i.date = ? `,
                    [branch.location_id, selectedDate],
                    (err3, invoiceDetails) => {
                      if (err3) return reject(err3);

                      let branch_order_count = invoiceDetails.length;
                      let total_branch_advance_payments = 0;
                      let actual_total_profit = 0;
                      let cash_collected = 0;

                      for (let invoice of invoiceDetails) {
                        const statusId = String(invoice.payment_status_id);
                        const totalPrice = parseFloat(invoice.total_price) || 0;
                        const advancePayment =
                          parseFloat(invoice.advance_payment) || 0;

                        if (statusId === "1") {
                          total_branch_advance_payments += advancePayment;
                          cash_collected += advancePayment;
                        }

                        if (statusId === "2") {
                          actual_total_profit += totalPrice;
                          cash_collected += totalPrice;
                        }
                      }

                      resolve({
                        location_id: branch.location_id,
                        location_name: branch.location_name,
                        branch_name: branch.branch_name,
                        selected_date: selectedDate,
                        year: year,
                        month: month,
                        month_range: `selectedDate`,

                        // Payment collections by method (matches Java output)
                        cashCollection: cashCollection,
                        cardCollection: cardCollection,
                        onlinePaymentCollection: onlinePaymentCollection,
                        totalSellingCollection: totalSellingCollection,
                        BankDeposit: BankDeposit,
                        TotalSale: TotalSale,

                        // Additional monthly metrics
                        order_count: branch_order_count,
                        total_advance_payments: total_branch_advance_payments,
                        actual_total_profit: actual_total_profit,
                        total_cash_collected: cash_collected,
                      });
                    },
                  );
                },
              );
            },
          );
        });
      }),
    );

    db.end();
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
