INSERT INTO tenants (id, name, slug, "createdAt", "updatedAt")
VALUES ('aaaa1111-1111-1111-1111-111111111111', 'Tenant A', 'tenant-a', now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO facilities (id, "tenantId", name, slug, address, city, status, "createdAt", "updatedAt")
VALUES (
  'aaaa2222-2222-2222-2222-222222222222',
  'aaaa1111-1111-1111-1111-111111111111',
  'Facility A',
  'facility-a',
  '1 Facility Road',
  'Test City',
  'ACTIVE',
  now(),
  now()
)
ON CONFLICT ("tenantId", slug) DO NOTHING;

INSERT INTO courts (id, "facilityId", name, "sportType", "createdAt", "updatedAt")
VALUES ('aaaa3333-3333-3333-3333-333333333333', 'aaaa2222-2222-2222-2222-222222222222', 'Court A1', 'Tennis', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, name, "passwordHash", "createdAt", "updatedAt")
VALUES
  ('aaaa4444-4444-4444-4444-444444444444', 'superadmin@test.com', 'Super Admin', '$2a$12$IuTJojykQ2NGynWKeFJAVuE6xMt7FA8RfE3aD0yp5vNZKcJ2R2z6K', now(), now()),
  ('aaaa5555-5555-5555-5555-555555555555', 'owner@test.com', 'Facility Owner', '$2a$12$IuTJojykQ2NGynWKeFJAVuE6xMt7FA8RfE3aD0yp5vNZKcJ2R2z6K', now(), now()),
  ('aaaa6666-6666-6666-6666-666666666666', 'user@test.com', 'Test Customer', '$2a$12$IuTJojykQ2NGynWKeFJAVuE6xMt7FA8RfE3aD0yp5vNZKcJ2R2z6K', now(), now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "user_tenants" (id, "userId", "tenantId", role, "createdAt", "updatedAt")
VALUES
  ('aaaa7771-7771-7771-7771-777777777771', 'aaaa4444-4444-4444-4444-444444444444', 'aaaa1111-1111-1111-1111-111111111111', 'SUPER_ADMIN', now(), now()),
  ('aaaa7772-7772-7772-7772-777777777772', 'aaaa5555-5555-5555-5555-555555555555', 'aaaa1111-1111-1111-1111-111111111111', 'FACILITY_ADMIN', now(), now()),
  ('aaaa7773-7773-7773-7773-777777777773', 'aaaa6666-6666-6666-6666-666666666666', 'aaaa1111-1111-1111-1111-111111111111', 'CUSTOMER', now(), now())
ON CONFLICT ("userId", "tenantId") DO NOTHING;

INSERT INTO slots (id, "courtId", "startTime", "endTime", "basePrice", currency, status, "isBooked", "createdAt", "updatedAt")
SELECT
  'aaaa888' || gs::text || '-8888-8888-8888-88888888888' || gs::text,
  'aaaa3333-3333-3333-3333-333333333333',
  now() + (gs || ' days')::interval,
  now() + (gs || ' days 1 hour')::interval,
  1200,
  'INR',
  'AVAILABLE',
  false,
  now(),
  now()
FROM generate_series(1, 5) gs
ON CONFLICT ("courtId", "startTime") DO NOTHING;
