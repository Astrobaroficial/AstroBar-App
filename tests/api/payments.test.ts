// Stripe/card flows. Requires STRIPE_SECRET_KEY and seeded users.
import request from "supertest";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { createTestApp } from "../testApp";
import { authHeader, loginAs } from "../testUtils";

const app = createTestApp();

// Helper to craft a bearer token for tests
function fakeToken(userId: string, role: string = 'customer') {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '1h' });
}

const TODO = !process.env.STRIPE_SECRET_KEY;

(TODO ? describe.skip : describe)("Stripe payment methods", () => {
  const userId = "test-customer";
  let token: string;

  function stripeClient() {
    return new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }

  async function createTestPaymentMethod() {
    const stripe = stripeClient();
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: { token: "tok_visa" },
    });
    return paymentMethod.id;
  }

  beforeAll(async () => {
    token = await loginAs(app, userId);
  });

  it("returns 200 for existing user on payment-method", async () => {
    const res = await request(app)
      .get(`/api/stripe/payment-method/${userId}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasCard");
  });

  it("creates setup intent for existing user", async () => {
    const res = await request(app)
      .post("/api/stripe/create-setup-intent")
      .set(authHeader(token))
      .send({ userId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("clientSecret");
  });

  it("saves payment method and returns masked card", async () => {
    const paymentMethodId = await createTestPaymentMethod();
    const res = await request(app)
      .post("/api/stripe/save-payment-method")
      .set(authHeader(token))
      .send({ userId, paymentMethodId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("card.last4");
    expect(res.body).toHaveProperty("card.brand");

    const check = await request(app)
      .get(`/api/stripe/payment-method/${userId}`)
      .set(authHeader(token));

    expect(check.status).toBe(200);
    expect(check.body).toHaveProperty("hasCard", true);
    expect(check.body).toHaveProperty("card.last4", res.body.card.last4);
    expect(check.body).toHaveProperty("card.brand", res.body.card.brand);
  });

  it("deletes payment method", async () => {
    const paymentMethodId = await createTestPaymentMethod();
    await request(app)
      .post("/api/stripe/save-payment-method")
      .set(authHeader(token))
      .send({ userId, paymentMethodId });

    const res = await request(app)
      .delete(`/api/stripe/payment-method/${userId}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);

    const check = await request(app)
      .get(`/api/stripe/payment-method/${userId}`)
      .set(authHeader(token));

    expect(check.status).toBe(200);
    expect(check.body).toHaveProperty("hasCard", false);
  });
});

// Negative path when Stripe is not configured
if (!process.env.STRIPE_SECRET_KEY) {
  describe("Stripe disabled", () => {
    const auth = { Authorization: `Bearer ${fakeToken("dummy")}` };

    it("responds 503 when creating setup intent without key", async () => {
      const res = await request(app)
        .post("/api/stripe/create-setup-intent")
        .set(auth)
        .send({ userId: "dummy" });
      expect(res.status).toBe(503);
    });
  });
}
