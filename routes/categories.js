const express = require("express");
const prisma = require("../lib/prisma");
const { readText } = require("../lib/http");

const router = express.Router();

router.post("/categories", async function (req, res) {
  const name = readText(req.body?.name);
  const backLink = "/?add=category#add-category";
  if (!name || name.length > 40) {
    return res.status(400).render("error", {
      message: "カテゴリ名を1〜40文字で入力してください。",
      backLink,
    });
  }

  try {
    const category = await prisma.category.create({ data: { name } });
    const query = new URLSearchParams({ category: category.id, added: "category" });
    return res.redirect(303, "/?" + query.toString());
  } catch (error) {
    if (error.code !== "P2002") throw error;

    return res.status(409).render("error", {
      message: "同じ名前のカテゴリがすでにあります。",
      backLink,
    });
  }
});

module.exports = router;
