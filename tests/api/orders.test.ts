import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Orders (customer flow)", () => {
  it("lists user orders", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app).get("/api/orders").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it("creates order with valid payload", async () => {
    const token = await loginAs(app, "test-customer");
    const subtotal = 10000;
    const deliveryFee = 2000;
    const nemyCommission = Math.round(subtotal * 0.15);
    const total = subtotal + deliveryFee + nemyCommission;
    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send({
        businessId: "test-biz-1",
        businessName: "Tacos Test",
        businessImage: null,
        items: "[]",
        subtotal,
        productosBase: subtotal,
        nemyCommission,
        deliveryFee,
        total,
        paymentMethod: "card",
        deliveryAddress: "Av. Pruebas 101",
        deliveryLatitude: "20.6736",
        deliveryLongitude: "-104.3647",
        notes: "Test order",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("orderId");
  });

  it("rejects order with invalid total", async () => {
    const token = await loginAs(app, "test-customer");
    const subtotal = 10000;
    const deliveryFee = 2000;
    const nemyCommission = Math.round(subtotal * 0.15);
    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send({
        businessId: "test-biz-1",
        businessName: "Tacos Test",
        businessImage: null,
        items: "[]",
        subtotal,
        productosBase: subtotal,
        nemyCommission,
        deliveryFee,
        total: 9999,
        paymentMethod: "card",
        deliveryAddress: "Av. Error 202",
      });

    expect(res.status).toBe(400);
  });

  it("fetches order detail and returns 404 for missing", async () => {
    const token = await loginAs(app, "test-customer");

    const listRes = await request(app).get("/api/orders").set(authHeader(token));
    const existingOrderId = listRes.body.orders?.[0]?.id || "order-pending-card";

    const okRes = await request(app)
      .get(`/api/orders/${existingOrderId}`)
      .set(authHeader(token));
    expect(okRes.status).toBe(200);

    const missingRes = await request(app)
      .get("/api/orders/missing-order")
      .set(authHeader(token));
    expect(missingRes.status).toBe(404);
  });

  it("allows regret cancel only in pending state", async () => {
    const token = await loginAs(app, "test-customer");
    const subtotal = 9000;
    const deliveryFee = 2000;
    const nemyCommission = Math.round(subtotal * 0.15);
    const total = subtotal + deliveryFee + nemyCommission;

    const createRes = await request(app)
      .post("/api/orders")
      .set(authHeader(token))
      .send({
        businessId: "test-biz-1",
        businessName: "Tacos Test",
        businessImage: null,
        items: "[]",
        subtotal,
        productosBase: subtotal,
        nemyCommission,
        deliveryFee,
        total,
        paymentMethod: "card",
        deliveryAddress: "Av. Regret 303",
      });

    const orderId = createRes.body.orderId as string;

    const cancelRes = await request(app)
      .post(`/api/orders/${orderId}/cancel-regret`)
      .set(authHeader(token));
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toHaveProperty("success", true);
  });
});
