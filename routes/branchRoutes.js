const express = require("express");
const router = express.Router();
const { fetchBranchDetails,fetch_month_branch_details } = require("../controllers/branchController");

router.post("/fetch", fetchBranchDetails);
router.post("/fetchMonth", fetch_month_branch_details);

module.exports = router;
