require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { attachUser, protect } = require("./middleware/authMiddleware");

const authRoutes = require("./routes/authRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const commentRoutes = require("./routes/commentRoutes");
const Recipe = require("./models/Recipe");
const User = require("./models/User");

const app = express();
connectDB();

// view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// attach user to every request (for API + views)
app.use(attachUser);

// API routes
app.use("/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/comments", commentRoutes);

// ---------- View routes (EJS) ----------
app.get("/", async (req, res) => {
  const recipes = await Recipe.find()
    .sort({ createdAt: -1 })
    .populate("createdBy", "username")
    .populate({ path: "comments", populate: { path: "user", select: "username" } });
  res.render("recipeList", { recipes });
});

app.get("/recipes/add", (req, res) => {
  if (!req.user) return res.redirect("/login");
  res.render("recipeForm");
});

app.get("/recipes/:id", async (req, res) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate("createdBy", "username")
    .populate({ path: "comments", populate: { path: "user", select: "username" } });
  if (!recipe) return res.redirect("/");
  res.render("recipeItem", { recipe });
});

app.get("/my-recipes", protect(), async (req, res) => {
  const user = await User.findById(req.user.id).populate("recipes");
  res.render("myRecipes", { recipes: user.recipes || [] });
});

app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));

// start
const PORT = process.env.PORT || 3632;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
