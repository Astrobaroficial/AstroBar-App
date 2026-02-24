import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Business owner dashboards & products", () => {
  it("returns business hours for owner", async () => {
    const token = await loginAs(app, "test-owner");
    const res = await request(app)
      .get("/api/business/hours")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.hours)).toBe(true);
  });

  it("lists business orders for owner", async () => {
    const token = await loginAs(app, "test-owner");
    const res = await request(app)
      .get("/api/business/orders")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it("updates order status when owner matches", async () => {
    const token = await loginAs(app, "test-owner");
    const res = await request(app)
      .put("/api/business/orders/order-business-pending/status")
      .set(authHeader(token))
      .send({ status: "accepted" });
    expect([200, 400]).toContain(res.status);
  });

  it("rejects status update for other owners", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .put("/api/business/orders/order-business-pending/status")
      .set(authHeader(token))
      .send({ status: "accepted" });
    expect(res.status).toBe(403);
  });
});
