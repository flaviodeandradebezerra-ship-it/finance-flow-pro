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

test("open finance consent integrates bank movements without manual refresh", async ({ page }) => {
  await page.goto("http://127.0.0.1:8000/");

  await expect(page.getByText("Atualizar painel")).toHaveCount(0);
  await expect(page.locator("#syncStatus")).toContainText("Sincronizacao automatica ativa");

  const firstCashValue = await page.locator(".metric-card").first().locator(".metric-value").innerText();

  await page.locator("#openFinanceButton").click();
  await expect(page.getByText("Autorizar integracao bancaria")).toBeVisible();
  await page.locator('input[value="itau"]').check();
  await page.locator('input[value="nubank"]').check();
  await page.locator("#openFinanceMode").selectOption("lote");
  await page.getByRole("button", { name: "Autorizar e integrar" }).click();

  await expect(page.locator("#openFinanceModal")).not.toBeVisible();
  await expect(page.locator(".toast")).toContainText("integrada");
  await expect(page.locator(".metric-card").first().locator(".metric-value")).not.toHaveText(firstCashValue);
});
