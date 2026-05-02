const getAppDb = require("../db/appDb");

const fetchBranchDetails = async (req, res) => {
  // Guard before touching session.user to avoid crash if not logged in
  if (!req.session?.username) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = getAppDb(req.session.user.db_name);
  const pdb = db.promise();

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const todayDate = `${now.getFullYear()}-${month}-${String(now.getDate()).padStart(2, "0")}`;

  const {
    username,
    user: { password },
  } = req.session;

  try {
    // ── 1. Find all branches this user manages ───────────────────────────
    const [branchResults] = await pdb.query(
      `SELECT bu.location_id,
              l.location_name,
              l.branch_name
       FROM   branch_users bu
       JOIN   users    u ON u.id          = bu.users_id
       JOIN   location l ON l.id          = bu.location_id
       WHERE  u.username = ? AND u.password = ?`,
      [username, password],
    );

    if (branchResults.length === 0) {
      return res.status(404).json({ error: "No matching branch found" });
    }

    const location_details = await Promise.all(
      branchResults.map(async (branch) => {
        const locId = branch.location_id;

        // ── 2. Payment collections from advance_payment_history ──────────────
        const [paymentRows] = await pdb.query(
          `SELECT pm.payment_name,
                  SUM(aph.paid_amount) AS total_paid
           FROM   advance_payment_history aph
           JOIN   payment_method pm ON pm.Payment_id = aph.payment_method
           WHERE  aph.date = ? AND aph.location_id = ?
           GROUP  BY pm.payment_name`,
          [todayDate, locId],
        );

        let cashCollection = 0;
        let cardCollection = 0;
        let onlinePaymentCollection = 0;
        let totalSellingCollection = 0;

        for (const row of paymentRows) {
          const amount = parseFloat(row.total_paid) || 0;
          if (row.payment_name === "Cash") cashCollection = amount;
          else if (row.payment_name === "Card") cardCollection = amount;
          else if (row.payment_name === "Online Bank Transfer")
            onlinePaymentCollection = amount;
          totalSellingCollection += amount;
        }

        // ── 3. Total sale — subtotal is VARCHAR so CAST to DECIMAL ──────────

        const [invoiceSumRows] = await pdb.query(
          `SELECT SUM(CAST(subtotal AS DECIMAL(10,2))) AS total_subtotal
           FROM   invoice
           WHERE  date = ? AND invoice_location = ?`,
          [todayDate, locId],
        );

        const TotalSale = parseFloat(invoiceSumRows[0]?.total_subtotal) || 0;

        // ── 4. Expenses from report_item → daily_report (your schema has no
        //       standalone expenses table; report_item.amount holds cash-out) ──

        const [expenseRows] = await pdb.query(
          `SELECT COALESCE(SUM(ri.amount), 0) AS total_expenses
           FROM   report_item  ri
           JOIN   daily_report dr ON dr.report_id = ri.daily_report_report_id
           WHERE  dr.date = ? AND dr.location_id  = ?`,
          [todayDate, locId],
        );

        const total_expenses = parseFloat(expenseRows[0]?.total_expenses) || 0;
        const BankDeposit = cashCollection - total_expenses;

        // ── 5. Invoice details for order count / advance payments / profit ───
        const [invoiceDetails] = await pdb.query(
          `SELECT i.advance_payment,
                  i.total_price,
                  i.payment_status_id
           FROM   invoice  i
           JOIN   customer c ON c.mobile = i.customer_mobile
           WHERE  c.location_id = ? AND i.date = ?`,
          [locId, todayDate],
        );

        let total_advance_payments = 0;
        let actual_total_profit = 0;

        for (const inv of invoiceDetails) {
          const sid = String(inv.payment_status_id);
          if (sid === "1")
            total_advance_payments += parseFloat(inv.advance_payment) || 0;
          else if (sid === "2")
            actual_total_profit += parseFloat(inv.total_price) || 0;
        }

        return {
          location_id: locId,
          location_name: branch.location_name,
          branch_name: branch.branch_name,
          today: todayDate,
          this_month: month,
          cashCollection,
          cardCollection,
          onlinePaymentCollection,
          totalSellingCollection,
          total_expenses,
          BankDeposit,
          TotalSale,
          order_count: invoiceDetails.length,
          total_advance_payments,
          actual_total_profit,
        };
      }),
    );

    res.json({ locations: location_details });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    await pdb.end();
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
