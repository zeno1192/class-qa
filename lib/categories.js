const prisma = require("./prisma");

const NEW_CATEGORY = "__new__";

function listCategories() {
  return prisma.category.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}

async function resolveCategoryId(db, question) {
  if (question.categoryId !== NEW_CATEGORY) return question.categoryId;

  const name = question.newCategoryName;
  const category = await db.category.upsert({
    where: { name },
    create: { name },
    update: { name },
  });
  return category.id;
}

module.exports = { NEW_CATEGORY, listCategories, resolveCategoryId };
