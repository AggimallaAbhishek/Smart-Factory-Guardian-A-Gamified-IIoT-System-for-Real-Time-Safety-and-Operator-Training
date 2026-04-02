import { expect, test } from "@playwright/test";

test("simulator flow updates score and shows results", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("player-name").fill("Asha");
  await page.getByTestId("bridge-token").fill("test-token");
  await page.getByTestId("source-select").selectOption("simulator");

  await page.getByTestId("connect-button").click();

  await expect(page.getByTestId("timer-value")).toBeVisible();

  const activeAlertPanel = page.getByTestId("active-alert-panel");
  await expect(activeAlertPanel).not.toContainText("Waiting for signal", {
    timeout: 8_000
  });

  const activeAlertText = (await activeAlertPanel.innerText()).toLowerCase();
  if (activeAlertText.includes("gas")) {
    await page.getByTestId("alert-gas").click();
  } else if (activeAlertText.includes("temperature")) {
    await page.getByTestId("alert-temperature").click();
  } else {
    await page.getByTestId("alert-maintenance").click();
  }

  await expect(page.getByTestId("score-value")).toContainText("10", {
    timeout: 3_000
  });

  await page.getByRole("button", { name: "Stop Session" }).click();

  await expect(page.getByTestId("result-score")).toBeVisible();
  await expect(page.getByTestId("result-accuracy")).toContainText("%", {
    timeout: 3_000
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-csv").click()
  ]);

  expect(download.suggestedFilename()).toContain("guardian-sessions-");
});
