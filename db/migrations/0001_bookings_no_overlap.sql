-- Prevent double booking: one master cannot have overlapping confirmed bookings.
-- Drizzle cannot describe exclusion constraints, so this is a custom migration.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "master_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" = 'confirmed');
