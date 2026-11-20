ALTER TABLE "Question" ADD COLUMN "lastPostNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Answer" ADD COLUMN "postNumber" INTEGER;

WITH numbered_answers AS (
    SELECT "id", ROW_NUMBER() OVER (
        PARTITION BY "questionId" ORDER BY "createdAt", "id"
    ) + 1 AS number
    FROM "Answer"
)
UPDATE "Answer"
SET "postNumber" = numbered_answers.number
FROM numbered_answers
WHERE "Answer"."id" = numbered_answers."id";

UPDATE "Question"
SET "lastPostNumber" = latest_answer.number
FROM (
    SELECT "questionId", MAX("postNumber") AS number
    FROM "Answer"
    GROUP BY "questionId"
) AS latest_answer
WHERE "Question"."id" = latest_answer."questionId";

ALTER TABLE "Answer" ALTER COLUMN "postNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Answer_questionId_postNumber_key" ON "Answer"("questionId", "postNumber");
DROP INDEX "Answer_questionId_idx";
