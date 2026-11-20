const express = require("express");
const prisma = require("../lib/prisma");
const { readText, readId, notFound } = require("../lib/http");
const { readQuestionForm, questionError } = require("../lib/question-fields");
const { readPostNumber } = require("../lib/post-number");
const { renderQuestionThread } = require("../lib/question-thread");

const router = express.Router();

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

router.get("/questions/:id", function (req, res) {
  const id = readId(req.params.id);
  if (!id) return notFound(res);

  return renderQuestionThread(res, id, { replyNumber: readPostNumber(req.query.reply) });
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
