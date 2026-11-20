require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("node:path");
const { categories } = require("./lib/question-fields");
const questionListRouter = require("./routes/question-list");
const questionsRouter = require("./routes/questions");
const answersRouter = require("./routes/answers");

const app = express();

app.locals.categories = categories;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(questionListRouter);
app.use(questionsRouter);
app.use(answersRouter);

app.use(function (req, res) {
  res.status(404).render("error", { message: "ページが見つかりません。" });
});

app.use(function (error, req, res, next) {
  if (res.headersSent) return next(error);

  // 他の利用者が先に削除した場合も、通常の「見つからない」として扱う。
  if (error.code === "P2025" || error.code === "P2003") {
    return res.status(404).render("error", { message: "質問または回答が見つかりません。" });
  }
  if (error.status === 413) {
    return res.status(413).render("error", { message: "送信した内容が長すぎます。" });
  }

  console.error(error);
  res.status(500).render("error", { message: "処理中にエラーが発生しました。" });
});

module.exports = app;
