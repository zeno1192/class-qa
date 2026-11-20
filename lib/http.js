function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readId(value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;

  const id = Number(value);
  // Prisma の Int は PostgreSQL の符号付き32ビット整数に対応する。
  return id <= 2147483647 ? id : null;
}

function notFound(res, message = "質問が見つかりません。") {
  return res.status(404).render("error", { message });
}

module.exports = { readText, readId, notFound };
