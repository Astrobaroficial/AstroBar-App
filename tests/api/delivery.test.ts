import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Delivery driver lifecycle", () => {
  it("returns driver status", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .get("/api/delivery/status")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("toggles availability", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .post("/api/delivery/toggle-status")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("gets available orders", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .get("/api/delivery/available-orders")
      .set(authHeader(token));
    expect(res.status).toBe(200);
  });

  it("accepts available order", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .post("/api/delivery/accept-order/order-pending-card")
      .set(authHeader(token));
    expect([200, 400]).toContain(res.status);
  });

  it("lists driver orders", async () => {
    const token = await loginAs(app, "test-driver");
    const res = await request(app)
      .get("/api/delivery/my-orders")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
