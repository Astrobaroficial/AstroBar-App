import request from "supertest";
import { createTestApp } from "../testApp";

const app = createTestApp();

describe("Auth flows (dev login)", () => {
  it("logs in with dev user and returns JWT", async () => {
    const res = await request(app)
      .post("/api/auth/dev-login")
      .send({ userId: "test-customer" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("id", "test-customer");
  });

  it("rejects dev login without userId", async () => {
    const res = await request(app).post("/api/auth/dev-login").send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown user", async () => {
    const res = await request(app)
      .post("/api/auth/dev-login")
      .send({ userId: "missing-user" });
    expect(res.status).toBe(404);
  });
});
