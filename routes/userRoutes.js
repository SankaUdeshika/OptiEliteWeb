const express = require("express");
const router = express.Router();
const { getAllUsers, login } = require("../controllers/userController");

router.get("/", getAllUsers);
router.get("/testing", (req, res) => {
  console.log(req.body);
  //   res.send("working testing");
  res.redirect("login");
});

module.exports = router;
