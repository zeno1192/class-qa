const prisma = require("./prisma");
const { notFound } = require("./http");
const { formatPostNumber, splitPostBody } = require("./post-number");

async function renderQuestionThread(res, questionId, { replyNumber, answerDraft, answerError = "" } = {}) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { answers: { orderBy: { postNumber: "asc" } } },
  });
  if (!question) return notFound(res);

  // 別のスレッドや削除済みの投稿番号は、返信リンクの候補に含めない。
  const postNumbers = new Set([1, ...question.answers.map((answer) => answer.postNumber)]);
  const replyBody = postNumbers.has(replyNumber) ? ">>" + formatPostNumber(replyNumber) + "\n" : "";
  const answerForm = answerDraft ?? { author: "", body: replyBody };

  return res.status(answerError ? 400 : 200).render("question", {
    question,
    postNumbers,
    formatPostNumber,
    splitPostBody,
    answerForm,
    answerError,
  });
}

module.exports = { renderQuestionThread };
