const getAppDb = require("../db/appDb");
const path = require("path");

const fetchAllBills = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  console.log("Fetch All Bills");

  try {
    const results = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` ORDER BY `invoice`.`date` DESC",
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (results.length === 0) return res.json("No Result");
    res.json(results);

  } catch (err) {
    console.error("Error fetching bills:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const ViewBill = (req, res) => {
  const invoice_id = req.params.id;
  console.log("View Bill" + invoice_id);

  if (req.session.username) {
    res.sendFile(path.join(__dirname, "../public/bills/viewBill.html"));
  } else {
    res.redirect("/login");
  }
};

const LoadBill = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoice_id = req.body.invoiceId;
  console.log("Invoice ID: " + invoice_id);

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `invoice` " +
          "INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
          "LEFT JOIN `prescription_details` ON `prescription_details`.`job_no` = `invoice`.`prescription_details_job_no` " +
          "INNER JOIN `payment_method` ON `payment_method`.`Payment_id` = `invoice`.`payment_method_Payment_id` " +
          "INNER JOIN `jobtype` ON `jobtype`.`job_id` = `invoice`.`JobType_job_id` " +
          "LEFT JOIN `lens_stock` ON `lens_stock`.`lens_id` = `invoice`.`lens_stock_lens_id` " +
          "INNER JOIN `payment_status` ON `payment_status`.`id` = `invoice`.`payment_status_id` " +
          "INNER JOIN `location` ON `location`.`id` = `invoice`.`invoice_location` " +
          "WHERE `invoice_id` = ?",
        [invoice_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading bill:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const loadStockItems = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoice_id = req.body.invoiceId;

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT " +
          "`invoice_item`.`invoice_id`" +
          ",`product_id`" +
          ",`product_name`" +
          ",`sub_category`" +
          ",`brand_name`" +
          ",`stock_id`" +
          ",`invoice_item`.`qty`" +
          ",`stock`.`saling_price`" +
          " FROM `invoice_item`" +
          " INNER JOIN `stock` ON `stock`.`id` = `invoice_item`.`stock_id`" +
          " INNER JOIN `product` ON `product`.`intid` = `stock`.`product_intid`" +
          " INNER JOIN `sub_category` ON `sub_category`.`id` = `product`.`sub_category_id`" +
          " INNER JOIN `brand` ON `brand`.`id` = `product`.`brand_id`" +
          " WHERE `invoice_id` = ?",
        [invoice_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading bill items:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const loadLensStock = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoice_id = req.body.invoiceId;
  console.log("Loading lens stock for invoice ID: " + invoice_id);

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `lens_stock` INNER JOIN `invoice` ON `invoice`.`lens_stock_lens_id` = `lens_stock`.`lens_id` WHERE `invoice`.`invoice_id` = ?",
        [invoice_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading lens stock:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const loadPaymentHistory = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoice_id = req.body.invoiceId;

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `advance_payment_history` INNER JOIN `payment_method` ON `payment_method`.`Payment_id` = `payment_method` WHERE `invoice_invoice_id` = ?",
        [invoice_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading payment history:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetchBillActions = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const User = req.session.username;
  const userId = User.split("_")[1];

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM `users` INNER JOIN `user_type` ON `users`.`user_type_id` = `user_type`.`id` WHERE `users`.`id` = ?",
        [userId],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error fetching bill actions:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetchInvoiceDetails = async (req, res) => {
  const invoice_id = req.params.id;
  console.log("View Bill" + invoice_id);

  if (req.session.username) {
    res.sendFile(path.join(__dirname, "../public/bills/invoice.html"));
  } else {
    res.redirect("/login");
  }
};

const loadCompanyHeaderData = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoiceId = req.params.id;

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * " +
          "FROM `invoice` " +
          "INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
          "INNER JOIN `location` ON `location`.`id` = `invoice_location` " +
          "INNER JOIN `payment_status` ON `invoice`.`payment_status_id` = `payment_status`.`id` " +
          "INNER JOIN `lens_stock` ON `lens_stock`.`lens_id` = `invoice`.`lens_stock_lens_id` " +
          "WHERE `invoice`.`invoice_id` = ?",
        [invoiceId],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading company header data:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const loadCompanystocks = async (req, res) => {
  const db = getAppDb(req.session.user.db_name); // ✅ moved inside
  const invoice_id = req.params.id;

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(
        "SELECT `Category`,`brand_name`,`invoice_item`.`qty`,`saling_price`,`product_id`,`product_name`,`sub_category` FROM `invoice_item` " +
          "INNER JOIN `stock` ON `invoice_item`.`stock_id` = `stock`.`id` " +
          "INNER JOIN `product` ON `product`.`intid` = `stock`.`product_intid` " +
          "INNER JOIN `brand` ON `product`.`brand_id` = `brand`.`id` " +
          "INNER JOIN `sub_category` ON `product`.`sub_category_id` = `sub_category`.`id` " +
          "INNER JOIN `category` ON `category`.`id` = `sub_category`.`category_id` " +
          "WHERE `invoice_item`.`invoice_id` = ?",
        [invoice_id],
        (err, result) => {
          db.end();
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);

  } catch (err) {
    console.error("Error loading company stocks:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  fetchAllBills,
  ViewBill,
  LoadBill,
  loadStockItems,
  loadLensStock,
  loadPaymentHistory,
  fetchBillActions,
  fetchInvoiceDetails,
  loadCompanyHeaderData,
  loadCompanystocks,
};