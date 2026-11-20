const { readText } = require("./http");

function readQuestionForm(body) {
  return {
    title: readText(body?.title),
    body: readText(body?.body),
    categoryId: readText(body?.category),
  };
}

function questionError(question, categories) {
  if (!question.title || !question.body || !question.categoryId) {
    return "タイトル、質問内容、カテゴリを入力してください。";
  }
  if (question.title.length > 100 || question.body.length > 2000) {
    return "タイトルは100文字、質問内容は2,000文字以内で入力してください。";
  }
  if (!categories.some((category) => category.id === question.categoryId)) {
    return "一覧にあるカテゴリを選んでください。";
  }
  return "";
}

module.exports = { readQuestionForm, questionError };
