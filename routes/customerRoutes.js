const express = require("express");
const router = express.Router();
const { getCustomerbyMobile,getAllCustomer,addnewCustomer } = require("../controllers/customerController");


router.post("/mobile_search", getCustomerbyMobile);
router.get("/getAllCustomers", getAllCustomer);
router.post("/addCustomer", addnewCustomer);
module.exports = router;