const getAppDb = require("../db/appDb");
const path = require("path");

const fetchAllBills = async (req, res) => {
  const db = getAppDb(req.session.user.db_name);
  console.log("Fetch All Bills", req.query);

  const { invoiceId, customerName, mobile, dateFrom, dateTo, status } =
    req.query;

  const where = [];
  const params = [];

  if (invoiceId && invoiceId.trim()) {
    where.push("`invoice`.`invoice_id` LIKE ?");
    params.push(`%${invoiceId.trim()}%`);
  }

  if (customerName && customerName.trim()) {
    where.push("`customer`.`name` LIKE ?");
    params.push(`%${customerName.trim()}%`);
  }

  if (mobile && mobile.trim()) {
    where.push("`customer`.`mobile` LIKE ?");
    params.push(`%${mobile.trim()}%`);
  }

  // invoice.date is VARCHAR, so convert it before comparing
  if (dateFrom) {
    where.push("STR_TO_DATE(`invoice`.`date`, '%Y-%m-%d') >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("STR_TO_DATE(`invoice`.`date`, '%Y-%m-%d') <= ?");
    params.push(dateTo);
  }

  // status: "pending" -> 1, "complete" -> 2, anything else -> all
  if (status === "pending") {
    where.push("`invoice`.`payment_status_id` = ?");
    params.push(1);
  } else if (status === "complete") {
    where.push("`invoice`.`payment_status_id` = ?");
    params.push(2);
  }

  const sql =
    "SELECT * FROM `invoice` " +
    "INNER JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
    (where.length ? "WHERE " + where.join(" AND ") + " " : "") +
    "ORDER BY `invoice`.`date` DESC, `invoice`.`order_time` DESC";

  try {
    const results = await new Promise((resolve, reject) => {
      db.query(sql, params, (err, result) => {
        db.end();
        if (err) return reject(err);
        resolve(result);
      });
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
        },
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
        },
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
        },
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
        },
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
        },
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
        },
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
        },
      );
    });

    if (result.length === 0) return res.json("No Result");
    res.json(result);
  } catch (err) {
    console.error("Error loading company stocks:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const _round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const _fmtDate = (d) => {
  if (!(d instanceof Date)) return d ? String(d) : "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// GET /api/bill/bills/details/:id
// One call = invoice + customer + prescription + items + lens + payment terms
const getBillDetails = async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  const db = getAppDb(req.session.user.db_name);
  const invoiceId = req.params.id;
  const q = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.query(sql, params, (err, result) =>
        err ? reject(err) : resolve(result),
      ),
    );

  try {
    // 1. invoice + customer + status + location
    const inv = await q(
      "SELECT i.*, c.name AS customer_name, c.email AS customer_email, " +
        "c.address_line1, c.address_line2, c.mobile2, c.telephone_land, c.nic, " +
        "ps.status_name, l.location_name " +
        "FROM invoice i " +
        "INNER JOIN customer c ON c.mobile = i.customer_mobile " +
        "LEFT JOIN payment_status ps ON ps.id = i.payment_status_id " +
        "LEFT JOIN location l ON l.id = i.invoice_location " +
        "WHERE i.invoice_id = ?",
      [invoiceId],
    );
    if (!inv.length)
      return res.status(404).json({ error: "Invoice not found" });
    const i = inv[0];

    // 2. prescription (only when the invoice has one)
    let prescription = null;
    const jobNo = i.prescription_details_job_no;
    if (jobNo !== null && jobNo !== undefined && String(jobNo).trim() !== "") {
      const pr = await q(
        "SELECT * FROM prescription_details WHERE job_no = ?",
        [jobNo],
      );
      if (pr.length) {
        const p = pr[0];
        prescription = {
          jobNo: p.job_no,
          date: _fmtDate(p.prescripiton_date),
          right: {
            sph: p.R_SPH,
            cyl: p.R_CYL,
            axis: p.R_Axis,
            add: p.R_Addition,
            dva: p.R_DVA,
            nva: p.R_NVA,
            pd: p.R_M_PD,
            height: p.R_HEIGHT,
          },
          left: {
            sph: p.L_SPH,
            cyl: p.L_CYL,
            axis: p.L_Axis,
            add: p.L_Addition,
            dva: p.L_DVA,
            nva: p.L_NVA,
            pd: p.L_M_PD,
            height: p.L_HEIGHT,
          },
        };
      }
    }

    // 3. frame / product items
    const itemRows = await q(
      "SELECT `invoice_item`.`stock_id`, `invoice_item`.`qty`, `stock`.`saling_price`, " +
        "`product_id`, `product_name`, `sub_category`, `brand_name` " +
        "FROM `invoice_item` " +
        "INNER JOIN `stock` ON `stock`.`id` = `invoice_item`.`stock_id` " +
        "INNER JOIN `product` ON `product`.`intid` = `stock`.`product_intid` " +
        "INNER JOIN `sub_category` ON `sub_category`.`id` = `product`.`sub_category_id` " +
        "INNER JOIN `brand` ON `brand`.`id` = `product`.`brand_id` " +
        "WHERE `invoice_item`.`invoice_id` = ?",
      [invoiceId],
    );
    const single = itemRows.length === 1;
    const items = itemRows.map((r) => {
      const qty = Number(r.qty) || 1;
      // the invoice keeps its own saved frame price (stock price may have changed later)
      const unit =
        single && Number(i.frame_total) > 0
          ? Number(i.frame_total) / qty
          : Number(r.saling_price) || 0;
      return {
        stockId: r.stock_id,
        name: `${r.product_name || ""}`.trim(),
        productCode: r.product_id,
        brand: r.brand_name,
        category: r.sub_category,
        qty,
        unitPrice: _round2(unit),
        lineTotal: _round2(unit * qty),
      };
    });

    // 4. lens
    let lens = null;
    if (i.lens_stock_lens_id) {
      const l = await q(
        "SELECT ls.lens_code, ls.lens_price, s.Supplier_Name " +
          "FROM lens_stock ls LEFT JOIN supplier s ON s.supplier_id = ls.supplier_id " +
          "WHERE ls.lens_id = ?",
        [i.lens_stock_lens_id],
      );
      const qty = Number(i.lens_Qty) || 0;
      const unit = l.length ? Number(l[0].lens_price) || 0 : 0;
      lens = {
        lensId: i.lens_stock_lens_id,
        code: l.length ? l[0].lens_code : "",
        supplier: l.length ? l[0].Supplier_Name : "",
        qty,
        unitPrice: unit,
        lineTotal:
          Number(i.lenstotal) > 0 ? _round2(i.lenstotal) : _round2(unit * qty),
      };
    }

    // 5. payment terms (advance_payment_history)
    const payRows = await q(
      "SELECT a.idadvance_payment_history AS id, a.date, a.time, a.paid_amount, " +
        "COALESCE(pm.payment_name, a.payment_method) AS method " +
        "FROM advance_payment_history a " +
        "LEFT JOIN payment_method pm ON pm.Payment_id = a.payment_method " +
        "WHERE a.invoice_invoice_id = ? ORDER BY a.date, a.time",
      [invoiceId],
    );
    const payments = payRows.map((r) => ({
      id: r.id,
      date: _fmtDate(r.date),
      time: r.time ? String(r.time).slice(0, 5) : "",
      amount: Number(r.paid_amount) || 0,
      method:
        r.method === null || r.method === undefined ? "" : String(r.method),
    }));
    const paidHistory = _round2(payments.reduce((s, p) => s + p.amount, 0));

    // 6. totals (invoice.subtotal is the net amount after discount)
    const net = _round2(i.subtotal);
    const discount = _round2(i.discount);
    const due = _round2(i.total_price);

    res.json({
      invoice: {
        id: i.invoice_id,
        date: _fmtDate(i.date),
        status: i.status_name || "",
        statusId: i.payment_status_id,
        location: i.location_name || "",
        deliveryDate: _fmtDate(i.delivery_date),
        deliveryTime: i.delivery_time
          ? String(i.delivery_time).slice(0, 5)
          : "",
      },
      customer: {
        name: i.customer_name,
        mobile: i.customer_mobile,
        mobile2: i.mobile2,
        landline: i.telephone_land,
        email: i.customer_email,
        nic: i.nic,
        address: [i.address_line1, i.address_line2].filter(Boolean).join(", "),
      },
      prescription,
      items,
      lens,
      payments,
      totals: {
        gross: _round2(net + discount),
        discount,
        discountPercentage: i.discount_percentage
          ? String(i.discount_percentage).trim()
          : "",
        net,
        paid: paidHistory,
        due,
        // true when the saved due amount does not match net - payment history
        dueMismatch: Math.abs(_round2(net - paidHistory) - due) > 0.01,
      },
    });
  } catch (err) {
    console.error("getBillDetails:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    db.end();
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
  getBillDetails,
};
