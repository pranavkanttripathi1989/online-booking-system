-- BUG037: two real seeded Rooms rows store "consultation" (a plain string,
-- not a real room_types.id) in their room_type column, predating the
-- id-based FK convention the real create/edit room form now uses
-- (confirmed live: the form's own Select sends room_types.id verbatim).
-- rooms.service.ts#resolveTypeNames() looks room_type up by id, so these
-- rows silently resolved roomTypeName to null.
--
-- Correct their room_type to the real room_types.id matching the org's own
-- "Consultation Room" row -- the only room type that exists for this org,
-- and the one this literal "consultation" string was clearly meant to name.
-- Scoped narrowly (exact legacy value, name match) rather than a broad
-- heuristic, since this is a one-time correction of known corrupted rows,
-- not a general-purpose migration path.
UPDATE "Rooms" r
SET room_type = rt.id
FROM room_types rt
WHERE r.room_type = 'consultation'
  AND rt.name = 'Consultation Room';
