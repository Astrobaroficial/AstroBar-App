import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Admin dashboards and management", () => {
  it("rejects non-admin with 403", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .get("/api/admin/users")
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it("returns dashboard metrics", async () => {
    const token = await loginAs(app, "test-admin");
    const res = await request(app)
      .get("/api/admin/dashboard/metrics")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("activeOrders");
  });

  it("lists users", async () => {
    const token = await loginAs(app, "test-admin");
    const res = await request(app)
      .get("/api/admin/users")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it("lists orders with enrichment", async () => {
    const token = await loginAs(app, "test-admin");
    const res = await request(app)
      .get("/api/admin/orders")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it("lists wallets summary", async () => {
    const token = await loginAs(app, "test-admin");
    const res = await request(app)
      .get("/api/admin/wallets")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
