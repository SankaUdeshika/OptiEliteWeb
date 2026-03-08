const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  login,
  updateUserLocation,
  getUserDetails,
} = require("../controllers/userController");

router.get("/", getAllUsers);
router.post("/login", login);
router.post("/updateLocation", updateUserLocation);
router.get("/getUserDetails",getUserDetails);
module.exports = router;
