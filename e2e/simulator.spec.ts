import { expect, test } from "@playwright/test";

test("login + room flow with mock signals", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Operator ID").fill("OP-7734");
  await page.getByLabel("Passcode").fill("12345678");
  await page.getByTestId("google-login").click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("create-room")).toBeEnabled();

  await page.getByTestId("create-room").click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+\/lobby$/);
  await expect(page.getByTestId("room-id")).toBeVisible();
  await expect(page.getByTestId("queue-list")).toBeVisible();

  await page.getByTestId("host-start").click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+\/game$/);
  await expect(page.getByTestId("timer-value")).toBeVisible();

  await page.getByTestId("hardware-start").click();
  await expect(page.getByTestId("hardware-status-message")).toContainText("Mock", {
    timeout: 5_000
  });

  const alertLabel = page.getByTestId("active-alert-label");
  await expect(alertLabel).not.toContainText("Standby", {
    timeout: 8_000
  });

  const currentAlert = (await alertLabel.innerText()).toLowerCase();
  if (currentAlert.includes("gas")) {
    await page.getByTestId("alert-gas").click();
  } else if (currentAlert.includes("temperature")) {
    await page.getByTestId("alert-temperature").click();
  } else {
    await page.getByTestId("alert-maintenance").click();
  }

  await expect(page.getByTestId("score-value")).toContainText("10", {
    timeout: 3_000
  });

  await page.getByTestId("host-end").click();
  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+\/result$/);

  await expect(page.getByTestId("result-score")).toBeVisible();
  await expect(page.getByTestId("result-accuracy")).toContainText("%");
  await expect(page.getByTestId("leaderboard-table")).toBeVisible();
});
