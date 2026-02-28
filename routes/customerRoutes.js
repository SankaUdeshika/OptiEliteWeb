const express = require("express");
const router = express.Router();
const { getCustomerbyMobile,getAllCustomer } = require("../controllers/customerController");


router.post("/mobile_search", getCustomerbyMobile);
router.get("/getAllCustomers", getAllCustomer);
module.exports = router;