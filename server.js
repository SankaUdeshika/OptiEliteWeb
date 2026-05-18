const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const session = require("express-session");
const path = require("path"); // Added for cleaner path handling

const app = express();
const port = 3000;

const userRoutes = require("./routes/userRoutes");
const branchRoutes = require("./routes/branchRoutes");
const billRoutes = require("./routes/billRoutes");
const customerRoutes = require("./routes/customerRoutes");
const stockRoutes = require("./routes/stockRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const reportRoutes = require("./routes/reportRoutes");

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: "keyboard cat",
    cookie: { maxAge: 3600000 }, // 1 hour
    resave: false,
    saveUninitialized: false,
  }),
);

/**
 * Serve the "public" folder as the root for static files.
 */
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// --- Controller Routes ---
app.use("/api/users", userRoutes);
app.use("/user", userRoutes);
app.use("/branch", branchRoutes);
app.use("/api/bill", billRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/prescription", prescriptionRoutes);
app.use("/api", reportRoutes);

// --- Page Routes ---
app.get("/", (req, res) => {
  console.log("Session in / route:", req.session);
  if (req.session && req.session.username) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  // If already logged in, redirect to home
  if (req.session && req.session.username) {
    res.redirect("/");
  } else {
    res.sendFile(path.join(__dirname, "public", "auth-login.html"));
  }
});

app.get("/manage_bills", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(path.join(__dirname, "public", "bills", "manageBills.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/add_bill", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(path.join(__dirname, "public", "bills", "addBill.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/customerRegister", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(
      path.join(__dirname, "public", "customer", "customerRegister.html"),
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/add_prescription", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(
      path.join(__dirname, "public", "prescription", "add-prescription.html"),
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/view_prescriptions", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(
      path.join(__dirname, "public", "prescription", "prescription.html"),
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/goReports", (req, res) => {
  if (req.session && req.session.username) {
    res.sendFile(
      path.join(__dirname, "public", "reports", "rEx.html"),
    );
  } else {
    res.redirect("/login");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:3000`);
});
