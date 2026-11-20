const express = require("express");
const prisma = require("../lib/prisma");
const { readText, readId, notFound } = require("../lib/http");
const { renderQuestionThread } = require("../lib/question-thread");

const router = express.Router();

router.post("/questions/:id/answers", async function (req, res) {
  const questionId = readId(req.params.id);
  if (!questionId) return notFound(res);

  const author = readText(req.body?.author);
  const body = readText(req.body?.body);
  if (!author || !body || author.length > 40 || body.length > 2000) {
    return renderQuestionThread(res, questionId, {
      answerDraft: { author, body },
      answerError: "回答者名を1〜40文字、回答内容を1〜2,000文字で入力してください。",
    });
  }

  // 採番と回答の保存をまとめ、同時に投稿しても同じ番号にならないようにする。
  const answer = await prisma.$transaction(async function (db) {
    const question = await db.question.update({
      where: { id: questionId },
      data: { lastPostNumber: { increment: 1 } },
    });
    return db.answer.create({
      data: { questionId, author, body, postNumber: question.lastPostNumber },
    });
  });
  res.redirect(303, "/questions/" + questionId + "#post-" + answer.postNumber);
});

router.post("/questions/:id/answers/:answerId/delete", async function (req, res) {
  const questionId = readId(req.params.id);
  const answerId = readId(req.params.answerId);
  if (!questionId || !answerId) return notFound(res, "回答が見つかりません。");

  // URL の質問に属する回答だけが削除の対象になる。
  await prisma.answer.delete({ where: { id: answerId, questionId } });
  res.redirect(303, "/questions/" + questionId + "#answers");
});

module.exports = router;
