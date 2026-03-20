const express = require("express");
const router = express.Router();
const { addPrescription , getCustomerPrescriptions } = require("../controllers/prescriptionController");


router.post("/add", addPrescription);
router.post("/get_prescription", getCustomerPrescriptions);
module.exports = router;