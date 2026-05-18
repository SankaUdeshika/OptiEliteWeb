const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// Monthly report routes
router.get("/monthly-report/summary", reportController.getMonthlySummary);
router.get(
  "/monthly-report/payment-breakdown",
  reportController.getPaymentBreakdown,
);
router.get("/monthly-report/daily-trend", reportController.getDailyTrend);
router.get(
  "/monthly-report/branch-breakdown",
  reportController.getBranchBreakdown,
);
router.get(
  "/monthly-report/complete",
  reportController.getCompleteMonthlyReport,
);
router.get("/monthly-report/export", reportController.exportMonthlyReport);

module.exports = router;
