BEGIN;

ALTER TYPE "Category" RENAME TO "LegacyCategory";

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- 既存質問の分類と、公開済みのカテゴリ検索URLを引き継ぐ。
INSERT INTO "Category" ("id", "name") VALUES
    ('CLASS', '授業'),
    ('EXTRACURRICULAR', '課外活動'),
    ('OTHER', 'その他');

ALTER TABLE "Question" RENAME COLUMN "category" TO "categoryId";
ALTER TABLE "Question" ALTER COLUMN "categoryId" TYPE TEXT USING "categoryId"::TEXT;
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Question_categoryId_idx" ON "Question"("categoryId");

DROP TYPE "LegacyCategory";

COMMIT;
