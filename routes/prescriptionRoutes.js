const express = require("express");
const router = express.Router();
const { addPrescription } = require("../controllers/prescriptionController");


router.post("/add", addPrescription);
module.exports = router;