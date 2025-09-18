const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const router = express.Router();

// Show Register Page
router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// Register POST
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (await User.findOne({ email })) {
      return res.render("register", {
        error: "Email already exists",
        success: null,
      });
    }

    const user = await User.create({ username, email, password, role });
    const token = generateToken(user._id, user.role);
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.render("register", {
      error: null,
      success: `Registered successfully! Welcome, ${user.username}`,
    });
  } catch (err) {
    res.render("register", { error: err.message, success: null });
  }
});

// Show Login Page
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Login POST
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id, user.role);
      res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.redirect("/"); // redirect to a dashboard page
    }

    res.render("login", { error: "Invalid credentials" });
  } catch (err) {
    res.render("login", { error: err.message });
  }
});

// Logout
router.get("/logout", (req, res) => {
  res.clearCookie("jwt");
  res.redirect("/login");
});

module.exports = router;
