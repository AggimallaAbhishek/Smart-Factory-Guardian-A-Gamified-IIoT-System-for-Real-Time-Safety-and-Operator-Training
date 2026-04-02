import { expect, test } from "@playwright/test";

test("multiplayer demo flow with host hardware mock", async ({ page, context }) => {
  await page.goto("/");

  await page.getByTestId("google-login").click();
  await expect(page.getByTestId("auth-user")).toBeVisible();
  await page.getByTestId("create-room").click();

  await expect(page).toHaveURL(/\/room\/[A-Z0-9]+\/lobby/);
  const roomId = (await page.getByTestId("room-id").innerText()).trim();

  const playerPage = await context.newPage();
  await playerPage.goto("/");
  await playerPage.getByTestId("google-login").click();
  await playerPage.getByTestId("join-room-input").fill(roomId);
  await playerPage.getByTestId("join-room").click();

  await expect(playerPage).toHaveURL(new RegExp("/room/" + roomId + "/lobby$"));
  await expect(playerPage.getByTestId("queue-list")).toContainText("2 players");

  await page.getByTestId("host-start").click();

  await expect(page).toHaveURL(new RegExp("/room/" + roomId + "/game$"));
  await expect(playerPage).toHaveURL(new RegExp("/room/" + roomId + "/game$"));

  const pageIsHost = await page.getByTestId("hardware-start").isVisible().catch(() => false);
  const controlPage = pageIsHost ? page : playerPage;
  const spectatorPage = pageIsHost ? playerPage : page;

  await controlPage.getByTestId("hardware-start").click();

  await expect.poll(
    async () => {
        if (await controlPage.getByTestId("alert-gas").isEnabled()) {
          return "control";
        }

        if (await spectatorPage.getByTestId("alert-gas").isEnabled()) {
          return "spectator";
        }

      return "none";
    },
    { timeout: 10_000 }
  ).not.toBe("none");

  const activeActor = (await controlPage.getByTestId("alert-gas").isEnabled()) ? "control" : "spectator";
  const actorPage = activeActor === "control" ? controlPage : spectatorPage;
  const activeAlertPanel = actorPage.getByTestId("active-alert-panel");
  await expect(activeAlertPanel).not.toContainText("No active alert", { timeout: 10_000 });

  const alertText = (await activeAlertPanel.innerText()).toLowerCase();
  if (alertText.includes("gas")) {
    await actorPage.getByTestId("alert-gas").click();
  } else if (alertText.includes("temperature")) {
    await actorPage.getByTestId("alert-temperature").click();
  } else {
    await actorPage.getByTestId("alert-maintenance").click();
  }

  await expect(actorPage.getByTestId("score-value")).not.toHaveText("0", { timeout: 5_000 });

  await controlPage.getByTestId("host-force-next").click();
  await controlPage.getByTestId("host-end").click();

  await expect(page).toHaveURL(new RegExp("/room/" + roomId + "/result$"));
  await expect(playerPage).toHaveURL(new RegExp("/room/" + roomId + "/result$"));

  await expect(page.getByTestId("leaderboard-table")).toBeVisible();
  await expect(playerPage.getByTestId("leaderboard-table")).toBeVisible();
});
