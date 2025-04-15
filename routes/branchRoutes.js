const express = require("express");
const router = express.Router();
const { fetchBranchDetails } = require("../controllers/branchController");

router.post("/fetch", fetchBranchDetails);

module.exports = router;
