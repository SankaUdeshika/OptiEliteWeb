const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const session = require("express-session");

const app = express();
const port = 3000;

const userRoutes = require("./routes/userRoutes");
const branchRoutes = require("./routes/branchRoutes");

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({ secret: "keyboard cat", cookie: { maxAge: 60000 } }));

// app.use(express.static("public")); // serve frontend files
app.use("/assets", express.static(__dirname + "/assets"));

// Controller Routes
app.use("/api/users", userRoutes);
app.use("/user", userRoutes);
app.use("/brnch", branchRoutes);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html"); // tempory thing, must remove this
  if (req.session.username) {
    res.sendFile(__dirname + "/public/index.html");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/auth-login.html");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
