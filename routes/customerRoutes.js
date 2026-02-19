const express = require("express");
const router = express.Router();
const { getCustomerbyMobile } = require("../controllers/customerController");


router.post("/mobile_search", getCustomerbyMobile);
module.exports = router;