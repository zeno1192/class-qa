const assert = require("node:assert/strict");
const { once } = require("node:events");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");

test("質問と回答の登録・表示・編集・検索・削除", async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, "テスト専用の TEST_DATABASE_URL を設定してください。");
  process.env.POSTGRES_PRISMA_URL = process.env.TEST_DATABASE_URL;
  process.env.POSTGRES_URL_NON_POOLING = process.env.TEST_DATABASE_URL;
  const app = require("../app");
  const prisma = require("../lib/prisma");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const base = "http://127.0.0.1:" + server.address().port;
  const marker = randomUUID();
  const questionIds = [];
  t.after(async () => {
    server.close();
    try {
      await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  function post(path, values = {}) {
    return fetch(base + path, {
      method: "POST",
      body: new URLSearchParams(values),
      redirect: "manual",
    });
  }

  async function page(path, expectedStatus = 200) {
    const response = await fetch(base + path);
    assert.equal(response.status, expectedStatus, path);
    return response.text();
  }

  async function createQuestion(title, body, category) {
    const response = await post("/questions", { title, body, category, author: "投稿者" });
    assert.equal(response.status, 303);
    const detailPath = response.headers.get("location");
    questionIds.push(Number(detailPath.split("/").at(-1)));
    return detailPath;
  }

  const missing = "/questions/2147483647";
  const title = "授業の質問 " + marker;
  const newerTitle = "別の質問 " + marker;
  const questionForm = await page("/questions/new");
  assert.match(questionForm, /質問を投稿/);
  assert.match(questionForm, /name="author"[^>]*required/);
  assert.equal((await post("/questions", {
    title, body: "本文", category: "CLASS", author: " ",
  })).status, 400);
  assert.match(await page("/style.css"), /\.question-list/);
  assert.equal((await post("/questions", { title: " " })).status, 400);
  assert.match(await page(missing, 404), /質問が見つかりません/);
  assert.equal((await post(missing + "/delete")).status, 404);

  const first = await createQuestion(title, "検索対象の本文 " + marker + "%", "CLASS");
  const second = await createQuestion(newerTitle, "別の質問の本文", "OTHER");
  const list = await page("/?keyword=" + marker);
  assert.ok(list.includes(title) && list.includes(newerTitle));
  assert.ok(list.indexOf(newerTitle) < list.indexOf(title));
  const firstThread = await page(first);
  assert.match(firstThread, /未解決/);
  assert.match(firstThread, /投稿 0001 へのリンク">0001/);
  assert.match(firstThread, /<strong>投稿者<\/strong>/);
  assert.match(firstThread, /name="author"[^>]*required/);
  assert.match(await page(first + "/edit"), /質問を編集/);

  const updatedTitle = "修正した質問 " + marker;
  assert.equal((await post(first + "/edit", {
    title: updatedTitle, body: "検索対象の本文 " + marker + "% <script>alert(1)</script>",
    category: "EXTRACURRICULAR", author: "変更されない",
  })).status, 303);
  const updated = await page(first);
  assert.ok(updated.includes(updatedTitle) && updated.includes("課外活動") && updated.includes("投稿者"));
  assert.ok(!updated.includes("<script>alert(1)</script>"));
  const results = await page("/?keyword=" + encodeURIComponent(marker + "%") + "&category=EXTRACURRICULAR");
  assert.ok(results.includes(updatedTitle) && !results.includes(newerTitle));
  assert.match(await page("/?keyword=" + encodeURIComponent(marker + "_")), /条件に一致する質問はありません/);

  const answerDraft = ">>0001 書きかけの回答";
  const rejectedAnswer = await post(first + "/answers", { author: " ", body: answerDraft });
  assert.equal(rejectedAnswer.status, 400);
  const answerErrorPage = await rejectedAnswer.text();
  assert.match(answerErrorPage, /role="alert">回答者名を/);
  assert.match(answerErrorPage, />&gt;&gt;0001 書きかけの回答<\/textarea>/);
  assert.match(answerErrorPage, /回答 0 件/);

  const missingQuestionAnswer = await post(missing + "/answers", { author: "", body: "" });
  assert.equal(missingQuestionAnswer.status, 404);
  const firstAnswer = await post(first + "/answers", { author: "回答者A", body: ">>0001 最初の回答" });
  assert.equal(firstAnswer.status, 303);
  assert.equal(firstAnswer.headers.get("location"), first + "#post-2");
  const replyForm = await page(first + "?reply=0002");
  assert.match(replyForm, /required>&gt;&gt;0002/);
  assert.match(await page(first + "?reply=2"), /required>&gt;&gt;0002/);
  assert.doesNotMatch(await page(second + "?reply=0002"), /required>&gt;&gt;0002/);
  assert.equal((await post(first + "/answers", { author: "回答者B", body: ">>2 次の回答" })).status, 303);
  const thread = await page(first);
  assert.match(thread, /回答 2 件/);
  assert.match(thread, /投稿 0002 へのリンク">0002/);
  assert.match(thread, /投稿 0003 へのリンク">0003/);
  assert.match(thread, /<strong>回答者A<\/strong>/);
  assert.match(thread, /href="#post-1">&gt;&gt;0001<\/a>/);
  assert.match(thread, /href="#post-2">&gt;&gt;2<\/a>/);
  assert.doesNotMatch(await page(second), /最初の回答|次の回答/);
  const sorted = await page("/?keyword=" + marker + "&sort=answers");
  assert.ok(sorted.indexOf(updatedTitle) < sorted.indexOf(newerTitle));

  assert.equal((await post(first + "/status", { resolved: "true" })).status, 303);
  assert.match(await page(first), /解決済み/);
  const resolved = await page("/?keyword=" + marker + "&category=EXTRACURRICULAR&state=resolved&sort=answers");
  assert.ok(resolved.includes(updatedTitle) && !resolved.includes(newerTitle));
  assert.equal((resolved.match(/name="category"/g) || []).length, 1);
  assert.match(resolved, /value="EXTRACURRICULAR" selected/);
  assert.match(resolved, /value="resolved" selected/);
  assert.match(resolved, /value="answers" selected/);
  assert.ok(resolved.includes('value="' + marker + '"'));
  assert.equal((await post(first + "/status", { resolved: "false" })).status, 303);
  assert.match(await page(first), /未解決/);

  const questionId = questionIds[0];
  const answer = await prisma.answer.findUnique({ where: { questionId_postNumber: { questionId, postNumber: 2 } } });
  assert.equal((await post(second + "/answers/" + answer.id + "/delete")).status, 404);
  assert.equal((await post(first + "/answers/" + answer.id + "/delete")).status, 303);
  assert.equal(await prisma.answer.count({ where: { questionId } }), 1);
  assert.doesNotMatch(await page(first), /href="#post-2">&gt;&gt;2<\/a>/);
  const simultaneousReplies = await Promise.all([
    post(first + "/answers", { author: "回答者C", body: "同時投稿A" }),
    post(first + "/answers", { author: "回答者D", body: "同時投稿B" }),
  ]);
  assert.deepEqual(simultaneousReplies.map((response) => response.status), [303, 303]);
  assert.deepEqual(simultaneousReplies.map((response) => response.headers.get("location")).sort(),
    [first + "#post-4", first + "#post-5"]);
  assert.match(await page(first + "/delete"), /質問を削除しますか/);
  assert.equal(await prisma.question.count({ where: { id: questionId } }), 1);
  assert.equal((await post(first + "/delete")).status, 303);
  assert.match(await page(first, 404), /質問が見つかりません/);
  assert.equal(await prisma.answer.count({ where: { questionId } }), 0);
});
