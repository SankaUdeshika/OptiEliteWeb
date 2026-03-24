const express = require("express");
const router = express.Router();
const { addPrescription , getCustomerPrescriptions,viewPrescriptionDetails } = require("../controllers/prescriptionController");


router.post("/add", addPrescription);
router.post("/get_prescription", getCustomerPrescriptions);
router.get("/view/:id", viewPrescriptionDetails);

module.exports = router;