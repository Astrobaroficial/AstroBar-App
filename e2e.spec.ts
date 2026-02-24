import { test, expect, request } from "@playwright/test";

const getBaseUrl = () =>
  process.env.BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

const testCustomerId = process.env.E2E_TEST_CUSTOMER_ID || "test-customer";

async function getAuthToken() {
  const api = await request.newContext({ baseURL: getBaseUrl() });
  const loginRes = await api.post("/api/auth/dev-login", {
    data: { userId: testCustomerId },
  });

  if (loginRes.status() !== 200) {
    return null;
  }

  const loginData = await loginRes.json();
  return loginData?.token || null;
}

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/health");
  expect(res.ok()).toBeTruthy();
});

test("order totals include NEMY commission", async ({ request }) => {
  const token = await getAuthToken();
  if (!token) {
    test.skip(true, "dev-login unavailable or test user missing");
  }

  const subtotal = 10000;
  const deliveryFee = 2000;
  const nemyCommission = Math.round(subtotal * 0.15);
  const total = subtotal + deliveryFee + nemyCommission;

  const createRes = await request.post("/api/orders", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
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
      deliveryAddress: "Av. E2E 101",
      deliveryLatitude: "20.6736",
      deliveryLongitude: "-104.3647",
      notes: "E2E order",
    },
  });

  if (!createRes.ok()) {
    const body = await createRes.text();
    throw new Error(`Create order failed: ${createRes.status()} ${body}`);
  }

  const createBody = await createRes.json();
  const orderId = createBody.orderId || createBody.id;
  expect(orderId).toBeTruthy();

  const detailRes = await request.get(`/api/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(detailRes.ok()).toBeTruthy();
  const detailBody = await detailRes.json();
  const order = detailBody.order || detailBody;

  expect(order.total).toBe(total);
  expect(order.deliveryFee).toBe(deliveryFee);
  expect(order.subtotal).toBe(subtotal);
});
