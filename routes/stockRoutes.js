const express = require("express");
const router = express.Router();
const { getAllStock } = require("../controllers/stockController");


router.get("/getAllStocks", getAllStock); // ,ethana idn hadanna oni.
module.exports = router;