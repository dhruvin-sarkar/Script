-- Add optional linked devlog support for forum threads on the unified Post table.
ALTER TABLE "Post"
ADD COLUMN "devlogId" TEXT;

-- Forum threads can link back to a DEVLOG post for extra context.
ALTER TABLE "Post"
ADD CONSTRAINT "Post_devlogId_fkey"
FOREIGN KEY ("devlogId") REFERENCES "Post"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Post_devlogId_idx" ON "Post"("devlogId");
