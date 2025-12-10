const express = require("express");
const router = express.Router();
const {
  fetchAllBills,
  ViewBill,
  LoadBill,
  loadStockItems,
  loadLensStock,
  loadPaymentHistory,
  fetchBillActions,
  fetchInvoiceDetails,
  loadCompanyHeaderData,
} = require("../controllers/billController");

router.get("/bills", fetchAllBills);
router.get("/bills/View/:id", ViewBill);
router.post("/bills/loadData", LoadBill);
router.post("/bills/loadProductStock", loadStockItems);
router.post("/bills/loadLensStock", loadLensStock);
router.post("/bills/loadPaymentHistory", loadPaymentHistory);
router.get("/bills/fetchBillActions", fetchBillActions);
router.get("/bills/View/print/:id",fetchInvoiceDetails);
router.get("/bills/loadCompanyHeaderData/:id", loadCompanyHeaderData);


module.exports = router;
