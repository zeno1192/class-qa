const prisma = require("./prisma");

function listCategories() {
  return prisma.category.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}

module.exports = { listCategories };
