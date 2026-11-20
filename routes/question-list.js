const express = require("express");
const prisma = require("../lib/prisma");
const { readText } = require("../lib/http");
const { validCategory } = require("../lib/question-fields");

const router = express.Router();

router.get("/", async function (req, res) {
  const keyword = readText(req.query.keyword).slice(0, 100);
  const selectedCategory = readText(req.query.category);
  const category = validCategory(selectedCategory) ? selectedCategory : "";
  const selectedState = readText(req.query.state);
  const state = ["open", "resolved"].includes(selectedState) ? selectedState : "";
  const sort = req.query.sort === "answers" ? "answers" : "newest";

  const where = {};
  if (keyword) {
    // PostgreSQL の部分一致で、入力した % や _ を文字どおりに検索する。
    const searchText = keyword.replace(/[\\%_]/g, "\\$&");
    where.OR = [
      { title: { contains: searchText, mode: "insensitive" } },
      { body: { contains: searchText, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (state) where.resolved = state === "resolved";

  const newestFirst = [{ createdAt: "desc" }, { id: "desc" }];
  const orderBy = sort === "answers"
    ? [{ answers: { _count: "desc" } }, ...newestFirst]
    : newestFirst;
  const questions = await prisma.question.findMany({
    where,
    orderBy,
    include: { _count: { select: { answers: true } } },
  });

  res.render("index", { questions, keyword, category, state, sort });
});

module.exports = router;
