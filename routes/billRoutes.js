const express = require("express");
const router = express.Router();
const { fetchAllBills, ViewBill } = require("../controllers/billController");

router.get("/bills", fetchAllBills);
router.get("/bills/View/:id", ViewBill);

module.exports = router;