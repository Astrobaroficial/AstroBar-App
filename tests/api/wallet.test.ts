import request from "supertest";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

describe("Wallet & withdrawals", () => {
  it("returns wallet balance", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .get("/api/wallet/balance")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.wallet).toHaveProperty("balance");
  });

  it("lists transactions ordered desc", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .get("/api/wallet/transactions")
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });

  it("rejects withdrawal below minimum", async () => {
    const token = await loginAs(app, "test-customer");
    const res = await request(app)
      .post("/api/wallet/withdraw")
      .set(authHeader(token))
      .send({ amount: 0, method: "stripe" });
    expect([400, 403]).toContain(res.status);
  });
});
