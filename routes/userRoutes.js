const express = require("express");
const router = express.Router();
const { getAllUsers, login,updateUserLocation } = require("../controllers/userController");

router.get("/", getAllUsers);
router.post("/login", login);
router.post("/updateLocation", updateUserLocation);
module.exports = router;
