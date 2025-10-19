const { error, Console } = require("console");
const db = require("../db/db");
const path = require("path");
const { rejects } = require("assert");
const { json } = require("stream/consumers");
const session = require("express-session");

const fetchAllBills = async (req, res) => {
  console.log("Fetch All Bills");

  const results = await new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `invoice` INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` ORDER BY `invoice`.`date` DESC",
      (err, result) => {
        if (err) {
          console.error("Error fetching bills:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });

  if (results.length === 0) {
    return res.json("No Result");
  } else {
    // console.log(results);
    res.json(results);
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
  const invoice_id = req.body.invoiceId;
  console.log("Invoice ID: " + invoice_id);
  const result = await new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `invoice` " +
        "INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
        "LEFT JOIN `prescription_details` ON `prescription_details`.`job_no` = `invoice`.`prescription_details_job_no` " +
        "INNER JOIN `payment_method` ON `payment_method`.`Payment_id` = `invoice`.`payment_method_Payment_id` " +
        "INNER JOIN `jobtype` ON `jobtype`.`job_id` = `invoice`.`JobType_job_id` " +
        "LEFT JOIN `lens_stock` ON `lens_stock`.`lens_id` = `invoice`.`lens_stock_lens_id` " +
        "iNNER JOIN `payment_status` ON `payment_status`.`id` = `invoice`.`payment_status_id` " +
        "INNER JOIN `location` ON `location`.`id` = `invoice`.`invoice_location` " +
        " WHERE `invoice_id` = ?",
      [invoice_id],
      (err, result) => {
        if (err) {
          console.error("Error loading bill:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });

  if (result.length === 0) {
    return res.json("No Result");
  } else {
    // console.log(result);
    res.json(result);
  }
};

const loadStockItems = async (req, res) => {
  const invoice_id = req.body.invoiceId;

  const result = await new Promise((resolve, reject) => {
    db.query(
      "SELECT  " +
        " `invoice_item`.`invoice_id`" +
        ",`product_id`" +
        ",`product_name`" +
        ",`sub_category`" +
        ",`brand_name`" +
        ",`stock_id`" +
        ",`invoice_item`.`qty`" +
        ",`stock`.`saling_price`" +
        "FROM `invoice_item`" +
        " INNER JOIN `stock` ON `stock`.`id` = `invoice_item`.`stock_id`" +
        " INNER JOIN `product` ON `product`.`intid` = `stock`.`product_intid`" +
        " INNER JOIN `sub_category` ON `sub_category`.`id` = `product`.`sub_category_id`" +
        " INNER JOIN `brand` ON `brand`.`id` = `product`.`brand_id`" +
        " WHERE `invoice_id` = ?",
      [invoice_id],
      (err, result) => {
        if (err) {
          console.error("Error loading bill items:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });
  if (result.length === 0) {
    return res.json("No Result");
  } else {
    // console.log(result);
    res.json(result);
  }
};

const loadLensStock = async (req, res) => {
  const invoice_id = req.body.invoiceId;

  const result = await new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `lens_stock` INNER JOIN `invoice` ON `invoice`.`lens_stock_lens_id` = `lens_stock`.`lens_id` WHERE `invoice`.`invoice_id` = ?",
      [invoice_id],
      (err, result) => {
        if (err) {
          console.error("Error loading lens stock:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });

  if (result.length === 0) {
    return res.json("No Result");
  } else {
    // console.log(result);
    res.json(result);
  }
};

const loadPaymentHistory = async (req, res) => {
  const invoice_id = req.body.invoiceId;
  console.log("Invoice ID: " + invoice_id);
  const result = await new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `advance_payment_history` INNER JOIN `payment_method` ON `payment_method`.`Payment_id` = `payment_method` WHERE `invoice_invoice_id` = ?",
      [invoice_id],
      (err, result) => {
        if (err) {
          console.error("Error loading bill:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });
  if (result.length === 0) {
    console.log("No Result");
    return res.json("No Result");
  } else {
    // console.log(result);
    res.json(result);
  }
};

const fetchBillActions = async (req, res) => {
  const User = req.session.username;
  console.log("User: " + User);
  const userId = User.split("_")[1];

  // Implementation for fetching bill actions goes here
  const result = await new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM `users` INNER JOIN `user_type` ON `users`.`user_type_id` = `user_type`.`id` WHERE `users`.`id` = ?",
      [userId],
      (err, result) => {
        if (err) {
          console.error("Error fetching bill actions:", err);
          return reject(err);
        }
        resolve(result);
      }
    );
  });

  if (result.length === 0) {
    console.log("No Result");
  } else {
    console.log(result);
    res.json(result);
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
};
