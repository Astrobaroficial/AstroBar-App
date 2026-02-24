import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Support tickets", () => {
  it("creates ticket for user", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .post("/api/support/tickets")
      .set(authHeader(token))
      .send({ message: "Necesito ayuda", subject: "Pedido", priority: "low" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("chatId");
  });

  it("lists own tickets", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .get("/api/support/tickets/test-customer")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.tickets)).toBe(true);
  });

  it("returns 400 when chat message missing", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .post("/api/support/chat")
      .set(authHeader(token))
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("Favorites", () => {
  it("adds favorite (auth required)", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .post("/api/favorites")
      .set(authHeader(token))
      .send({ userId: "test-customer", businessId: "test-biz-1" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("lists favorites for user", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .get("/api/favorites/test-customer")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("deletes favorite", async () => {
    const token = await loginAs(app, "test-customer");
    const createRes = await request(app)
      .post("/api/favorites")
      .set(authHeader(token))
      .send({ userId: "test-customer", businessId: "test-biz-1" });

    const favoriteId = createRes.body.favorite?.id as string;

    const res = await request(app)
      .delete(`/api/favorites/${favoriteId}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });
});
