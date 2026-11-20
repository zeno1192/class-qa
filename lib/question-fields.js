const { readText } = require("./http");

const categories = {
  CLASS: "授業",
  EXTRACURRICULAR: "課外活動",
  OTHER: "その他",
};

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

module.exports = { categories, validCategory, readQuestionForm, questionError };
