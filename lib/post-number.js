const { readId } = require("./http");

function formatPostNumber(number) {
  return String(number).padStart(4, "0");
}

function readPostNumber(value) {
  if (typeof value !== "string") return null;

  // 表示上の先頭ゼロを外すと、既存の投稿番号として扱える。
  return readId(value.replace(/^0+/, ""));
}

function splitPostBody(body, postNumbers) {
  const parts = body.split(/((?:>>|＞＞)[0-9]+)/);
  return parts.map((text) => {
    const number = /^(?:>>|＞＞)/.test(text) ? readPostNumber(text.slice(2)) : null;
    return { text, linkNumber: postNumbers.has(number) ? number : null };
  });
}

module.exports = { formatPostNumber, readPostNumber, splitPostBody };
