const express = require("express");
const router = express.Router();
const {
  loadEditOrder,
  searchFrames,
  searchLenses,
  addPayment,
  deletePayment,
  saveOrder,
} = require("../controllers/editOrderController");

// search routes first, so "/search/..." is not read as an invoice id
router.get("/search/frames", searchFrames);
router.get("/search/lenses", searchLenses);

router.get("/:id", loadEditOrder);
router.put("/:id", saveOrder);
router.post("/:id/payments", addPayment);
router.delete("/:id/payments/:paymentId", deletePayment);

module.exports = router;