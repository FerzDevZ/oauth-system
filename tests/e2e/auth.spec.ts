import { expect, test, type Page } from "@playwright/test";

const GOOGLE_CALLBACK = "http://localhost:3000/auth/google/callback";

/**
 * Mock seluruh endpoint Google OAuth agar test berjalan tanpa kredensial / jaringan asli.
 */
async function mockGoogleOAuth(page: Page) {
  await page.route("https://accounts.google.com/**", async (route) => {
    const state = new URL(route.request().url()).searchParams.get("state") ?? "";
    await route.fulfill({
      status: 302,
      headers: {
        location: `${GOOGLE_CALLBACK}?code=mock_code&state=${encodeURIComponent(state)}`,
      },
    });
  });

  await page.route("https://oauth2.googleapis.com/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "mock_access_token" }),
    }),
  );

  await page.route("https://www.googleapis.com/oauth2/v3/userinfo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sub: "e2e-sub-123",
        email: "e2e@example.com",
        name: "User E2E",
        picture: "",
      }),
    }),
  );
}

async function loginViaGoogle(page: Page) {
  await mockGoogleOAuth(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Lanjutkan dengan Google/ }).click();
  await page.waitForURL("**/dashboard");
}

test("halaman login tampil & dashboard terlindungi", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Masuk ke Aplikasi/ })).toBeVisible();

  // Tanpa session, proxy harus melempar pengguna kembali ke halaman login
  await page.goto("/dashboard");
  await expect(page).toHaveURL((url) => url.pathname === "/");
});

test("login via Google (provider di-mock) → dashboard → logout", async ({ page }) => {
  await loginViaGoogle(page);

  await expect(page.getByText("User E2E")).toBeVisible();
  await expect(page.getByText("e2e@example.com")).toBeVisible();

  // Logout sesi saat ini
  await page.getByRole("button", { name: "Keluar (Logout)" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.getByRole("heading", { name: /Masuk ke Aplikasi/ })).toBeVisible();
});

test("login lalu keluar dari semua perangkat", async ({ page }) => {
  await loginViaGoogle(page);

  await page.getByRole("button", { name: "Keluar dari semua perangkat" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.getByRole("heading", { name: /Masuk ke Aplikasi/ })).toBeVisible();
});
