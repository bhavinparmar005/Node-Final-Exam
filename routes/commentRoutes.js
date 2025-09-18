const express = require("express");
const Comment = require("../models/Comment");
const Recipe = require("../models/Recipe");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------- ADD COMMENT ----------
router.post("/add", protect(), async (req, res) => {
  try {
    const { recipeId, text } = req.body;
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) return res.redirect("/recipes");

    const comment = await Comment.create({
      text,
      recipe: recipeId,
      user: req.user.id,
    });

    recipe.comments.push(comment._id);
    await recipe.save();

    res.redirect(`/recipes/${recipeId}#comments`); // redirect back to recipe page
  } catch (err) {
    res.send("Error adding comment: " + err.message);
  }
});

// ---------- GET COMMENTS BY RECIPE ----------
router.get("/recipe/:id", async (req, res) => {
  try {
    const comments = await Comment.find({ recipe: req.params.id })
      .populate("user", "username")
      .sort({ createdAt: -1 });

    // Render comments in EJS partial (optional)
    res.render("comments", { comments });
  } catch (err) {
    res.send("Error loading comments: " + err.message);
  }
});

// ---------- DELETE COMMENT ----------
router.post("/delete/:id", protect(), async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.redirect("/recipes");

    if (comment.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.send("Not authorized");
    }

    await comment.deleteOne();
    await Recipe.updateOne({ _id: comment.recipe }, { $pull: { comments: comment._id } });

    res.redirect(`/recipes/${comment.recipe}#comments`);
  } catch (err) {
    res.send("Error deleting comment: " + err.message);
  }
});

module.exports = router;
