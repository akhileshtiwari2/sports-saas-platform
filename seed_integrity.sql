INSERT INTO "tenants" ("id","name","slug","createdAt","updatedAt")
VALUES ('11111111-1111-1111-1111-111111111111','Integrity Tenant','integrity-tenant',now(),now())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "users" ("id","email","name","createdAt","updatedAt")
VALUES ('22222222-2222-2222-2222-222222222222','integrity-user@example.com','Integrity User',now(),now())
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "facilities" ("id","tenantId","name","slug","address","city","createdAt","updatedAt")
VALUES ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Integrity Facility','integrity-facility','1 Test Street','Test City',now(),now())
ON CONFLICT ("tenantId","slug") DO NOTHING;

INSERT INTO "courts" ("id","facilityId","name","sportType","createdAt","updatedAt")
VALUES ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','Court 1','Tennis',now(),now())
ON CONFLICT DO NOTHING;

INSERT INTO "slots" ("id","courtId","startTime","endTime","basePrice","createdAt","updatedAt")
VALUES ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444',now() + interval '1 day',now() + interval '1 day 1 hour',1000,now(),now())
ON CONFLICT ("courtId","startTime") DO NOTHING;

INSERT INTO "bookings" ("id","tenantId","facilityId","courtId","slotId","userId","status","totalAmount","currency","createdAt","updatedAt")
VALUES ('66666666-6666-6666-6666-666666666666','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555','22222222-2222-2222-2222-222222222222','PENDING',1000,'INR',now(),now())
ON CONFLICT DO NOTHING;
