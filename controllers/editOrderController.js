const getAppDb = require("../db/appDb");

/* ───────────── helpers ───────────── */

class UserError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const PAYMENT_METHODS = ["Cash", "Card", "Bank Deposit", "Online Bank Transfer", "MintPay", "KOKO"];

// Accepts either the method name ("Cash") or an old numeric id ("1")
const toMethodName = (value) => {
  if (value === null || value === undefined) return "";
  const v = String(value).trim();
  return /^[1-6]$/.test(v) ? PAYMENT_METHODS[Number(v) - 1] : v;
};

const fmtDate = (d) => {
  if (!(d instanceof Date)) return d ? String(d) : "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const run = (db, sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
  );
const begin = (db) => new Promise((res, rej) => db.beginTransaction((e) => (e ? rej(e) : res())));
const commit = (db) => new Promise((res, rej) => db.commit((e) => (e ? rej(e) : res())));
const rollback = (db) => new Promise((res) => db.rollback(() => res()));

const handleError = (res, err, label) => {
  if (err instanceof UserError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  console.error(label, err);
  res.status(500).json({ error: "Server error" });
};

const requireLogin = (req, res) => {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: "Not logged in" });
    return false;
  }
  return true;
};

const userLocationId = async (db, req) => {
  // the session copy goes stale after "updateLocation", so read it from the DB
  const r = await run(db, "SELECT `location_id` FROM `users` WHERE `id` = ?", [req.session.user.id]);
  return r.length ? r[0].location_id : req.session.user.location_id;
};

/* ───────────── data loaders ───────────── */

async function getInvoice(db, invoiceId) {
  const inv = await run(
    db,
    "SELECT `invoice`.*, `customer`.`name` AS `customer_name`, `customer`.`nic` AS `customer_nic` " +
      "FROM `invoice` LEFT JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
      "WHERE `invoice`.`invoice_id` = ?",
    [invoiceId]
  );
  if (!inv.length) throw new UserError("Invoice not found.", 404);

  const items = await run(
    db,
    "SELECT `ii`.`stock_id`, `s`.`product_intid`, `s`.`saling_price` " +
      "FROM `invoice_item` `ii` LEFT JOIN `stock` `s` ON `s`.`id` = `ii`.`stock_id` " +
      "WHERE `ii`.`invoice_id` = ? LIMIT 1",
    [invoiceId]
  );
  return { invoice: inv[0], item: items.length ? items[0] : null };
}

// The saved frame / lens prices (the invoice keeps its own price if the stock price changed later)
async function getOriginals(db, invoice, item) {
  const stockId = item && item.stock_id !== null ? String(item.stock_id) : "";
  let framePrice = 0;
  if (stockId) {
    framePrice = Number(invoice.frame_total) > 0 ? Number(invoice.frame_total) : Number(item.saling_price) || 0;
  }

  const lensId = invoice.lens_stock_lens_id ? String(invoice.lens_stock_lens_id) : "";
  const lensQty = lensId ? Number(invoice.lens_Qty) || 0 : 0;
  let lensTotal = 0, lensUnit = 0, lensCode = "", supplier = "";
  if (lensId) {
    const l = await run(
      db,
      "SELECT `lens_stock`.`lens_code`, `lens_stock`.`lens_price`, `supplier`.`Supplier_Name` " +
        "FROM `lens_stock` LEFT JOIN `supplier` ON `supplier`.`supplier_id` = `lens_stock`.`supplier_id` " +
        "WHERE `lens_stock`.`lens_id` = ?",
      [lensId]
    );
    if (l.length) {
      lensUnit = Number(l[0].lens_price) || 0;
      lensCode = l[0].lens_code;
      supplier = l[0].Supplier_Name;
    }
    lensTotal = Number(invoice.lenstotal) > 0 ? Number(invoice.lenstotal) : round2(lensUnit * lensQty);
  }
  return { stockId, framePrice, lensId, lensQty, lensTotal, lensUnit, lensCode, supplier };
}

async function loadPayments(db, invoiceId) {
  const rows = await run(
    db,
    "SELECT `idadvance_payment_history`, `date`, `time`, `paid_amount`, `payment_method` " +
      "FROM `advance_payment_history` WHERE `invoice_invoice_id` = ? ORDER BY `date`, `time`",
    [invoiceId]
  );
  return rows.map((r) => ({
    id: r.idadvance_payment_history,
    dateTime: `${fmtDate(r.date)} ${r.time || ""}`.trim(),
    amount: Number(r.paid_amount) || 0,
    method: toMethodName(r.payment_method),
  }));
}

async function getPaid(db, invoiceId) {
  const r = await run(
    db,
    "SELECT COALESCE(SUM(`paid_amount`), 0) AS `paid` FROM `advance_payment_history` WHERE `invoice_invoice_id` = ?",
    [invoiceId]
  );
  return round2(r[0].paid);
}

const FRAME_SELECT =
  "SELECT `stock`.`id` AS `stock_id`, `brand`.`brand_name`, `sub_category`.`sub_category`, " +
  "`stock`.`saling_price`, `product`.`id` AS `product_code`, `stock`.`qty` " +
  "FROM `stock` " +
  "INNER JOIN `product` ON `product`.`intid` = `stock`.`product_intid` " +
  "INNER JOIN `sub_category` ON `sub_category`.`id` = `product`.`sub_category_id` " +
  "INNER JOIN `category` ON `category`.`id` = `sub_category`.`category_id` " +
  "INNER JOIN `brand` ON `brand`.`id` = `product`.`brand_id` ";

/* ───────────── calculation (port of ChangeTotal / the Add Discount button) ───────────── */

function parseDiscount(raw, subTotal) {
  const text = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!text) return { discount: 0, pct: "" };

  if (text.endsWith("%")) {
    const p = Number(text.replace("%", "").trim());
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      throw new UserError("Discount percentage must be between 0 and 100.");
    }
    return { discount: round2((subTotal * p) / 100), pct: text };
  }

  const amount = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new UserError("Please enter a valid discount (example: 500 or 10%).");
  }
  // same as Java ChangeTotal(): the discount can never be more than the sub total
  return { discount: round2(Math.min(amount, subTotal)), pct: "" };
}

function computeTotals({ framePrice, lensTotal, discountInput, paid }) {
  const subTotal = round2(framePrice + lensTotal);
  const d = parseDiscount(discountInput, subTotal);
  const net = round2(subTotal - d.discount);
  return { subTotal, discount: d.discount, discountPct: d.pct, net, paid, due: round2(net - paid) };
}

// Port of paymentsChanged(): paid + due follow the payment history
async function recalcPayments(db, invoiceId) {
  const paid = await getPaid(db, invoiceId);
  const inv = await run(db, "SELECT `subtotal` FROM `invoice` WHERE `invoice_id` = ?", [invoiceId]);
  if (!inv.length) throw new UserError("Invoice not found.", 404);
  const due = round2((Number(inv[0].subtotal) || 0) - paid);
  await run(
    db,
    "UPDATE `invoice` SET `advance_payment` = ?, `payment_amount` = ?, `total_price` = ? WHERE `invoice_id` = ?",
    [String(paid), String(paid), String(due), invoiceId]
  );
  return { paid, due };
}

/* ───────────── handlers ───────────── */

// GET /api/edit-order/:id  → everything the Edit Order screen needs (port of findData + Refresh)
const loadEditOrder = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  try {
    const { invoice, item } = await getInvoice(db, req.params.id);
    const o = await getOriginals(db, invoice, item);
    const payments = await loadPayments(db, req.params.id);
    const paid = round2(payments.reduce((s, p) => s + p.amount, 0));

    const pct = invoice.discount_percentage ? String(invoice.discount_percentage).trim() : "";
    const frameOptions =
      item && item.product_intid
        ? await run(db, FRAME_SELECT + "WHERE `product`.`intid` = ?", [item.product_intid])
        : [];

    res.json({
      invoice: {
        id: invoice.invoice_id,
        date: fmtDate(invoice.date),
        customerMobile: invoice.customer_mobile,
        customerName: invoice.customer_name,
        customerNic: invoice.customer_nic,
      },
      frame: { stockId: o.stockId, originalPrice: o.framePrice },
      lens: {
        id: o.lensId, code: o.lensCode, supplier: o.supplier,
        qty: o.lensQty, originalTotal: o.lensTotal, unitPrice: o.lensUnit,
      },
      discountInput: pct || String(Number(invoice.discount) || 0),
      frameOptions,
      payments,
      paid,
    });
  } catch (err) {
    handleError(res, err, "loadEditOrder");
  } finally {
    db.end();
  }
};

// GET /api/edit-order/search/frames?q=  (frames in stock at the user's branch)
const searchFrames = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  try {
    const loc = await userLocationId(db, req);
    const like = `%${String(req.query.q || "").trim()}%`;
    const rows = await run(
      db,
      FRAME_SELECT +
        "WHERE `category`.`id` IN (1, 4) AND `stock`.`qty` > 0 AND `stock`.`location_id` = ? " +
        "AND (`brand`.`brand_name` LIKE ? OR `product`.`id` LIKE ? OR `stock`.`SKU` LIKE ?) " +
        "LIMIT 50",
      [loc, like, like, like]
    );
    res.json(rows);
  } catch (err) {
    handleError(res, err, "searchFrames");
  } finally {
    db.end();
  }
};

// GET /api/edit-order/search/lenses?q=
const searchLenses = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  try {
    const like = `%${String(req.query.q || "").trim()}%`;
    const rows = await run(
      db,
      "SELECT `lens_stock`.`lens_id`, `lens_stock`.`lens_code`, `lens_stock`.`lens_price`, `supplier`.`Supplier_Name` " +
        "FROM `lens_stock` INNER JOIN `supplier` ON `supplier`.`supplier_id` = `lens_stock`.`supplier_id` " +
        "WHERE `lens_stock`.`lens_code` LIKE ? OR `lens_stock`.`lens_id` LIKE ? LIMIT 50",
      [like, like]
    );
    res.json(rows);
  } catch (err) {
    handleError(res, err, "searchLenses");
  } finally {
    db.end();
  }
};

// POST /api/edit-order/:id/payments   { amount, date: "YYYY-MM-DD", time: "HH:mm", methodId: 1..6 }
const addPayment = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  const invoiceId = req.params.id;
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount)) throw new UserError("Pay Amount must be a valid number.");
    if (amount <= 0) throw new UserError("Pay Amount must be greater than 0.");

    const date = String(req.body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new UserError("Please select a date.");

    const time = String(req.body.time || "");
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new UserError("Please select a time.");

    const methodId = parseInt(req.body.methodId, 10);
    if (!(methodId >= 1 && methodId <= PAYMENT_METHODS.length)) throw new UserError("Please select a payment method.");

    const inv = await run(
      db,
      "SELECT `invoice`.`invoice_location`, `customer`.`location_id` AS `customer_location` " +
        "FROM `invoice` LEFT JOIN `customer` ON `customer`.`mobile` = `invoice`.`customer_mobile` " +
        "WHERE `invoice`.`invoice_id` = ?",
      [invoiceId]
    );
    if (!inv.length) throw new UserError("Invoice not found.", 404);
    const locationId = inv[0].invoice_location || inv[0].customer_location;
    if (!locationId) throw new UserError("Could not determine location for this invoice.");

    await begin(db);
    try {
      await run(
        db,
        "INSERT INTO `advance_payment_history` (`invoice_invoice_id`, `paid_amount`, `date`, `time`, `payment_method`, `location_id`) " +
          "VALUES (?, ?, ?, ?, ?, ?)",
        [invoiceId, amount, date, time.length === 5 ? time + ":00" : time, methodId, locationId]
      );
      const totals = await recalcPayments(db, invoiceId);
      await commit(db);
      res.json({ success: true, ...totals, payments: await loadPayments(db, invoiceId) });
    } catch (e) {
      await rollback(db);
      throw e;
    }
  } catch (err) {
    handleError(res, err, "addPayment");
  } finally {
    db.end();
  }
};

// DELETE /api/edit-order/:id/payments/:paymentId
const deletePayment = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  const invoiceId = req.params.id;
  try {
    await begin(db);
    try {
      const del = await run(
        db,
        "DELETE FROM `advance_payment_history` WHERE `idadvance_payment_history` = ? AND `invoice_invoice_id` = ?",
        [req.params.paymentId, invoiceId]
      );
      if (del.affectedRows === 0) throw new UserError("Payment not found.", 404);
      const totals = await recalcPayments(db, invoiceId);
      await commit(db);
      res.json({ success: true, ...totals, payments: await loadPayments(db, invoiceId) });
    } catch (e) {
      await rollback(db);
      throw e;
    }
  } catch (err) {
    handleError(res, err, "deletePayment");
  } finally {
    db.end();
  }
};

// PUT /api/edit-order/:id   { frameStockId, lensId, lensQty, discount, confirmOverpay }
// Port of the Java "Update" button (jButton4ActionPerformed)
const saveOrder = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const db = getAppDb(req.session.user.db_name);
  const invoiceId = req.params.id;

  const frameStockId = String(req.body.frameStockId ?? "").trim();
  const lensId = String(req.body.lensId ?? "").trim();
  const lensQty = lensId ? parseInt(req.body.lensQty, 10) : 0;

  try {
    const { invoice, item } = await getInvoice(db, invoiceId);
    const orig = await getOriginals(db, invoice, item);

    // 1. validate the selections + pick the prices
    let framePrice = 0;
    if (frameStockId) {
      const s = await run(db, "SELECT `saling_price` FROM `stock` WHERE `id` = ?", [frameStockId]);
      if (!s.length) throw new UserError("Selected frame was not found. Please select a frame from the table.");
      framePrice = frameStockId === orig.stockId ? orig.framePrice : Number(s[0].saling_price) || 0;
    }

    let lensTotal = 0;
    if (lensId) {
      const l = await run(db, "SELECT `lens_price` FROM `lens_stock` WHERE `lens_id` = ?", [lensId]);
      if (!l.length) throw new UserError("Selected lens was not found. Please select a lens from the table.");
      if (!(lensQty > 0)) throw new UserError("Lens quantity must be 1 or more.");
      lensTotal =
        lensId === orig.lensId && lensQty === orig.lensQty
          ? orig.lensTotal
          : round2((Number(l[0].lens_price) || 0) * lensQty);
    }

    // 2. recalculate everything from the payment history, then check the balance
    const paid = await getPaid(db, invoiceId);
    const t = computeTotals({ framePrice, lensTotal, discountInput: req.body.discount, paid });

    if (t.due < 0 && req.body.confirmOverpay !== true) {
      throw new UserError(
        `Payments are more than the order total by Rs.${(-t.due).toFixed(2)}. Save anyway?`,
        409,
        { needsConfirm: true }
      );
    }

    await begin(db);
    try {
      // 3. stock movement for the frame
      let extraSet = "";
      if (!frameStockId) {
        if (orig.stockId) {
          await run(db, "UPDATE `stock` SET `qty` = `qty` + 1 WHERE `id` = ?", [orig.stockId]);
          await run(db, "DELETE FROM `invoice_item` WHERE `invoice_id` = ?", [invoiceId]);
        }
      } else if (frameStockId !== orig.stockId) {
        const dec = await run(db, "UPDATE `stock` SET `qty` = `qty` - 1 WHERE `id` = ? AND `qty` > 0", [frameStockId]);
        if (dec.affectedRows === 0) throw new UserError("Selected frame is out of stock. Please choose another.");

        if (orig.stockId) {
          await run(db, "UPDATE `stock` SET `qty` = `qty` + 1 WHERE `id` = ?", [orig.stockId]);
          await run(db, "UPDATE `invoice_item` SET `stock_id` = ? WHERE `invoice_id` = ?", [frameStockId, invoiceId]);
        } else {
          await run(db, "INSERT INTO `invoice_item` (`invoice_id`, `stock_id`, `qty`) VALUES (?, ?, 1)", [invoiceId, frameStockId]);
          extraSet = ", `job_warrenty_warrenty_id` = 1";
        }
      }

      // 4. save the invoice (payment history is NOT touched)
      await run(
        db,
        "UPDATE `invoice` SET `total_price` = ?, `frame_total` = ?, `advance_payment` = ?, `payment_amount` = ?, " +
          "`discount` = ?, `discount_percentage` = ?, `subtotal` = ?, `lenstotal` = ?, " +
          "`lens_stock_lens_id` = ?, `lens_Qty` = ?" + extraSet + " WHERE `invoice_id` = ?",
        [
          String(t.due), String(framePrice), String(paid), String(paid),
          String(t.discount), t.discountPct, String(t.net), String(lensTotal),
          lensId || null, String(lensId ? lensQty : 0), invoiceId,
        ]
      );
      await commit(db);
    } catch (e) {
      await rollback(db);
      throw e;
    }

    // 5. activity log (priority 1, same as the Java app) – never blocks the save
    try {
      const u = req.session.user;
      await run(
        db,
        "INSERT INTO `activity_log` (`log_text`, `users_id`, `date`, `activity_priority_id`) VALUES (?, ?, CURDATE(), 1)",
        [`No:- ${invoiceId} Order was Updated by ${u.fname || ""} ${u.lname || ""}`.trim(), u.id]
      );
    } catch (e) {
      console.error("activity log failed", e);
    }

    res.json({ success: true, totals: t });
  } catch (err) {
    handleError(res, err, "saveOrder");
  } finally {
    db.end();
  }
};

module.exports = {
  loadEditOrder, searchFrames, searchLenses, addPayment, deletePayment, saveOrder,
};