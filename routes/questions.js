const express = require("express");
const prisma = require("../lib/prisma");
const router = express.Router();

const categories = {
  CLASS: "授業",
  EXTRACURRICULAR: "課外活動",
  OTHER: "その他",
};
router.use(function (req, res, next) {
  res.locals.categories = categories;
  next();
});

function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validCategory(category) {
  return Object.hasOwn(categories, category);
}

function readQuestionForm(body) {
  return {
    title: readText(body?.title),
    body: readText(body?.body),
    category: readText(body?.category),
  };
}

function questionError(question) {
  if (!question.title || !question.body || !validCategory(question.category)) {
    return "タイトル、質問内容、カテゴリを入力してください。";
  }
  if (question.title.length > 100 || question.body.length > 2000) {
    return "タイトルは100文字、質問内容は2,000文字以内で入力してください。";
  }
  return "";
}

function readId(value) {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}

function notFound(res, message = "質問が見つかりません。") {
  return res.status(404).render("error", { message });
}

router.get("/", async function (req, res) {
  const keyword = readText(req.query.keyword).slice(0, 100);
  const selectedCategory = readText(req.query.category);
  const category = validCategory(selectedCategory) ? selectedCategory : "";
  const state = readText(req.query.state);
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
  if (state === "open" || state === "resolved") where.resolved = state === "resolved";

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

router.get("/questions/new", function (req, res) {
  res.render("question-form", {
    question: { title: "", body: "", category: "", author: "" },
    editing: false,
    error: "",
  });
});

// Create: フォームの name と同じ名前で req.body から値を受け取る。
router.post("/questions", async function (req, res) {
  const question = readQuestionForm(req.body);
  const author = readText(req.body?.author);
  const error = questionError(question) ||
    (!author || author.length > 40 ? "投稿者名を1〜40文字で入力してください。" : "");

  if (error) {
    return res.status(400).render("question-form", {
      question: { ...question, author }, editing: false, error,
    });
  }

  const savedQuestion = await prisma.question.create({
    data: { ...question, author },
  });
  res.redirect(303, "/questions/" + savedQuestion.id);
});

router.get("/questions/:id", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  const question = await prisma.question.findUnique({
    where: { id },
    include: { answers: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  if (!question) return notFound(res);

  res.render("question", { question });
});

router.get("/questions/:id/edit", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return notFound(res);

  res.render("question-form", { question, editing: true, error: "" });
});

// Update: URL の id で質問を指定し、編集フォームにある項目だけを更新する。
router.post("/questions/:id/edit", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  const question = readQuestionForm(req.body);
  const error = questionError(question);
  if (error) {
    const savedQuestion = await prisma.question.findUnique({ where: { id } });
    if (!savedQuestion) return notFound(res);

    return res.status(400).render("question-form", {
      question: { ...question, id }, editing: true, error,
    });
  }

  await prisma.question.update({ where: { id }, data: question });
  res.redirect(303, "/questions/" + id);
});

router.get("/questions/:id/delete", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return notFound(res);

  res.render("question-delete", { question });
});

// Delete: 削除確認画面の POST で質問を削除すると、DB が回答も連動して削除する。
router.post("/questions/:id/delete", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  await prisma.question.delete({ where: { id } });
  res.redirect(303, "/");
});

router.post("/questions/:id/answers", async function (req, res) {
  const questionId = readId(req.params.id);
  if (!questionId) return notFound(res);

  const author = readText(req.body?.author);
  const body = readText(req.body?.body);
  if (!author || !body || author.length > 40 || body.length > 2000) {
    return res.status(400).render("error", {
      message: "回答者名を1〜40文字、回答内容を1〜2,000文字で入力してください。",
      backLink: "/questions/" + questionId,
    });
  }

  await prisma.answer.create({ data: { questionId, author, body } });
  res.redirect(303, "/questions/" + questionId + "#answers");
});

router.post("/questions/:id/answers/:answerId/delete", async function (req, res) {
  const questionId = readId(req.params.id);
  const answerId = readId(req.params.answerId);
  if (!questionId || !answerId) return notFound(res, "回答が見つかりません。");

  // URL の質問に属する回答だけが削除の対象になる。
  await prisma.answer.delete({ where: { id: answerId, questionId } });
  res.redirect(303, "/questions/" + questionId + "#answers");
});

router.post("/questions/:id/status", async function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);
  if (req.body?.resolved !== "true" && req.body?.resolved !== "false") {
    return res.status(400).render("error", { message: "解決状態の指定が正しくありません。" });
  }

  await prisma.question.update({
    where: { id },
    data: { resolved: req.body.resolved === "true" },
  });
  res.redirect(303, "/questions/" + id);
});

module.exports = router;
