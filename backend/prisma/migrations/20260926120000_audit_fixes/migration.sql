-- Audit fixes -- 2026-09-26.
-- Hand-written because the database is not reachable from the dev machine.
-- Kept in exact agreement with prisma/schema.prisma; verified offline with
--   npx prisma validate
--   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- (init migration + this file = that full script).

-- ===========================================================================
-- Student: split the streak into round combo vs consecutive practice days,
-- and a one-time placement guard.
-- ===========================================================================
ALTER TABLE "Student" ADD COLUMN "dailyStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Student" ADD COLUMN "lastPracticeDay" TEXT;
ALTER TABLE "Student" ADD COLUMN "placementCompleted" BOOLEAN NOT NULL DEFAULT false;

-- ===========================================================================
-- Cascade consistency: every per-student child row goes away with the learner.
-- (StudentPreference, DailyChallengeCompletion and PracticeSession already
-- cascade; Account -> Student and Word -> Progress stay RESTRICT on purpose --
-- see the schema comments.)
-- ===========================================================================
ALTER TABLE "Progress" DROP CONSTRAINT "Progress_studentId_fkey";
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentBadge" DROP CONSTRAINT "StudentBadge_studentId_fkey";
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- Word.text becomes unique. Application writes always lower-case the text, so
-- the index only ever sees the normalised form. Existing duplicates are
-- repointed to the earliest row sharing the text (by createdAt) before the
-- duplicates are removed, so no learner history is lost.
-- ===========================================================================
WITH ranked AS (
    SELECT "id",
           FIRST_VALUE("id") OVER (PARTITION BY "text" ORDER BY "createdAt", "id") AS "keepId"
    FROM "Word"
),
dups AS (
    SELECT "id" AS "dupId", "keepId" FROM ranked WHERE "id" <> "keepId"
)
UPDATE "Progress" p SET "wordId" = d."keepId" FROM dups d WHERE p."wordId" = d."dupId";

WITH ranked AS (
    SELECT "id",
           FIRST_VALUE("id") OVER (PARTITION BY "text" ORDER BY "createdAt", "id") AS "keepId"
    FROM "Word"
),
dups AS (
    SELECT "id" AS "dupId", "keepId" FROM ranked WHERE "id" <> "keepId"
)
UPDATE "DailyChallengeCompletion" c SET "wordId" = d."keepId" FROM dups d WHERE c."wordId" = d."dupId";

WITH ranked AS (
    SELECT "id",
           FIRST_VALUE("id") OVER (PARTITION BY "text" ORDER BY "createdAt", "id") AS "keepId"
    FROM "Word"
),
dups AS (
    SELECT "id" AS "dupId", "keepId" FROM ranked WHERE "id" <> "keepId"
)
DELETE FROM "Word" w USING dups d WHERE w."id" = d."dupId";

CREATE UNIQUE INDEX "Word_text_key" ON "Word"("text");

-- Badge names are a friendly uniqueness guarantee (the seed skips existing
-- names) -- now enforced by the database too.
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- ===========================================================================
-- DailyChallengeCompletion:
--   * date TIMESTAMP(3) -> TEXT holding a pure UTC calendar day (YYYY-MM-DD),
--     which is what the application writes now. Existing values are already
--     stored as UTC instants, so formatting them in place is loss-free.
--     Two completions of the same learner on the same UTC day could not exist
--     (they were distinct timestamps only across days), but collapse them
--     first anyway so the unique index rebuild can never fail.
--   * wordId becomes an optional, real relation to Word (onDelete: SetNull)
--     so deleting a word never destroys a completion row.
-- The @@unique([studentId, date]) index survives the type change (Postgres
-- rebuilds it with the table rewrite), so it is not dropped/recreated here.
-- ===========================================================================
DELETE FROM "DailyChallengeCompletion" a
    USING "DailyChallengeCompletion" b
WHERE a."studentId" = b."studentId"
  AND a."id" > b."id"
  AND to_char(a."date", 'YYYY-MM-DD') = to_char(b."date", 'YYYY-MM-DD');

ALTER TABLE "DailyChallengeCompletion" ALTER COLUMN "date" TYPE TEXT USING to_char("date", 'YYYY-MM-DD');

ALTER TABLE "DailyChallengeCompletion" ALTER COLUMN "wordId" DROP NOT NULL;
ALTER TABLE "DailyChallengeCompletion" ADD CONSTRAINT "DailyChallengeCompletion_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
