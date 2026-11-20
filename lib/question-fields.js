const { readText } = require("./http");
const { NEW_CATEGORY } = require("./categories");

function readQuestionForm(body) {
  return {
    title: readText(body?.title),
    body: readText(body?.body),
    categoryId: readText(body?.category),
    newCategoryName: readText(body?.newCategoryName),
  };
}

function questionError(question, categories) {
  if (!question.title || !question.body || !question.categoryId) {
    return "タイトル、質問内容、カテゴリを入力してください。";
  }
  if (question.title.length > 100 || question.body.length > 2000) {
    return "タイトルは100文字、質問内容は2,000文字以内で入力してください。";
  }
  if (question.categoryId === NEW_CATEGORY) {
    if (!question.newCategoryName || question.newCategoryName.length > 40) {
      return "新しいカテゴリ名を1〜40文字で入力してください。";
    }
    return "";
  }
  if (!categories.some((category) => category.id === question.categoryId)) {
    return "一覧にあるカテゴリを選んでください。";
  }
  return "";
}

module.exports = { readQuestionForm, questionError };
