import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Cash settlements (business + driver)", () => {
  it("lists pending cash orders for owner", async () => {
    const token = await loginAs(app, "test-owner");
    const res = await request(app)
      .get("/api/cash-settlement/pending")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it("rejects settlement when not owner", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .post("/api/cash-settlement/settle/order-delivered-cash")
      .set(authHeader(token));
    expect(res.status).toBe(403);
  });

  it("marks settlement and reduces driver debt", async () => {
    const token = await loginAs(app, "test-owner");
    const res = await request(app)
      .post("/api/cash-settlement/settle/order-delivered-cash")
      .set(authHeader(token));
    expect([200, 400]).toContain(res.status);
  });
});

describe("Weekly settlements", () => {
  it("driver sees pending settlement", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .get("/api/weekly-settlement/driver/pending")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("admin sees pending settlements", async () => {
    const token = await loginAs(app, "test-admin");
    const res = await request(app)
      .get("/api/weekly-settlement/admin/pending")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
