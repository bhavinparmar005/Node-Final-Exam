const express = require("express");
const multer = require("multer");
const Recipe = require("../models/Recipe");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-")),
});
const upload = multer({ storage });

// ---------- CREATE ----------
router.get("/add", protect(), (req, res) => {
  res.render("recipeForm", { recipe: null, error: null });
});

router.post("/add", protect(), upload.single("image"), async (req, res) => {
  try {
    const { title, description, ingredients, instructions } = req.body;
    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : "/images/default-recipe.jpg";

    const recipe = await Recipe.create({
      title,
      description,
      ingredients: ingredients.split(",").map((i) => i.trim()),
      instructions,
      image: imagePath,
      createdBy: req.user.id,
    });

    const user = await User.findById(req.user.id);
    user.recipes.push(recipe._id);
    await user.save();

    res.redirect(`/recipes/${recipe._id}`);
  } catch (err) {
    res.render("recipeForm", { recipe: null, error: err.message });
  }
});

// ---------- READ ----------
router.get("/", async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "username")
      .populate({
        path: "comments",
        populate: { path: "user", select: "username" },
      });

    res.render("recipeList", { recipes });
  } catch (err) {
    res.send("Error loading recipes: " + err.message);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate("createdBy", "username")
      .populate({
        path: "comments",
        populate: { path: "user", select: "username" },
      });

    if (!recipe) return res.redirect("/recipes");
    res.render("recipeItem", { recipe });
  } catch (err) {
    res.send("Error loading recipe: " + err.message);
  }
});

// ---------- UPDATE ----------
router.get("/edit/:id", protect(), async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) return res.redirect("/recipes");
  if (recipe.createdBy.toString() !== req.user.id && req.user.role !== "admin")
    return res.send("Not authorized");

  res.render("recipeForm", { recipe, error: null });
});

router.post(
  "/edit/:id",
  protect(),
  upload.single("image"),
  async (req, res) => {
    try {
      const recipe = await Recipe.findById(req.params.id);
      if (!recipe) return res.redirect("/recipes");
      if (
        recipe.createdBy.toString() !== req.user.id &&
        req.user.role !== "admin"
      )
        return res.send("Not authorized");

      const { title, description, ingredients, instructions } = req.body;
      recipe.title = title || recipe.title;
      recipe.description = description || recipe.description;
      recipe.instructions = instructions || recipe.instructions;
      recipe.ingredients = ingredients
        ? ingredients.split(",").map((i) => i.trim())
        : recipe.ingredients;
      if (req.file) recipe.image = `/uploads/${req.file.filename}`;

      await recipe.save();
      res.redirect(`/recipes/${recipe._id}`);
    } catch (err) {
      res.render("recipeForm", { recipe, error: err.message });
    }
  }
);

// ---------- DELETE ----------
router.post("/delete/:id", protect(), async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.redirect("/recipes");
    if (
      recipe.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    )
      return res.send("Not authorized");

    await recipe.deleteOne();
    await User.updateOne(
      { _id: recipe.createdBy },
      { $pull: { recipes: recipe._id } }
    );

    res.redirect("/my-recipes");
  } catch (err) {
    res.send("Error deleting recipe: " + err.message);
  }
});

module.exports = router;
