const { test, expect } = require("@playwright/test");

test("sidebar modules update the main workspace", async ({ page }) => {
  await page.goto("http://127.0.0.1:8000/");

  await page.locator('[data-view="cashflow"]').first().click();
  await expect(page.locator("#moduleTitle")).toHaveText("Realizado, previsto e categorias");
  await expect(page.getByText("Movimentos e saldo acumulado")).toBeVisible();

  await page.locator('[data-view="credit"]').first().click();
  await expect(page.locator("#moduleTitle")).toHaveText("Score explicavel e simulacao");
  await expect(page.getByText("Custo estimado do credito")).toBeVisible();

  await page.locator('[data-view="assistant"]').first().click();
  await expect(page.locator("#moduleTitle")).toHaveText("Pergunte e execute a proxima acao");
  await expect(page.getByText("Assistente contextual")).toBeVisible();

  await page.locator('[data-view="dashboard"]').first().click();
  await expect(page.locator("#moduleTitle")).toHaveText("Decisoes financeiras em uma tela");
});
