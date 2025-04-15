const express = require("express");
const router = express.Router();
const { getAllUsers, login } = require("../controllers/userController");

router.get("/", getAllUsers);



router.post("/login", login);

module.exports = router;
