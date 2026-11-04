import { test, expect } from "@playwright/test";

// Uses the running real FastAPI backend and checked-in FMA subset. No request mocks.
test("guest onboarding, feature profile, recommendations and saved collection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Discover My Vibe", exact: true })
    .click();
  await page.locator(".genre-tile").first().click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const choices = page.locator("input[type=checkbox]");
  await expect(choices.first()).toBeVisible();
  for (let i = 0; i < 3; i++) await choices.nth(i).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate My Vibe", exact: true })
    .click();
  await expect(page).toHaveURL(/my-vibe/);
  await expect(
    page.getByText("YOUR MEASURED AUDIO PROFILE", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore all", exact: true }).click();
  await expect(page).toHaveURL(/mode=matches/);
  await expect(page.locator(".track-row").first()).toBeVisible();
  await page
    .locator(".track-row")
    .first()
    .getByRole("button", { name: /^Like / })
    .click();
  await page
    .locator(".track-row")
    .first()
    .getByRole("button", { name: /^Save .* to collection$/ })
    .click();
  await page
    .getByLabel("New collection name", { exact: true })
    .fill("QA collection");
  await page
    .getByRole("button", { name: "Create & save", exact: true })
    .click();
  await page.goto("/collections");
  await expect(
    page.getByRole("link", { name: /QA collection 1 records/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: /QA collection 1 records/ }),
  ).toBeVisible();
});

test("real experiment controls and responsive route rendering", async ({
  page,
}, testInfo) => {
  await page.goto("/ml-lab/kmeans");
  const k = page.getByLabel("Number of clusters", { exact: true });
  await k.waitFor();
  await k.press("End");
  await expect(page.getByText("K = 10", { exact: true })).toBeVisible();
  await page.goto("/ml-lab/hierarchy");
  await page.getByLabel("Dendrogram cut height", { exact: true }).press("End");
  await expect(
    page.getByText(/1 clusters · 120 sampled records/),
  ).toBeVisible();
  await page.goto("/ml-lab/pca");
  await page.locator("#components").press("End");
  await expect(
    page.getByText(/Retained components: 17 · 100.0% variance/),
  ).toBeVisible();
  for (const path of [
    "/",
    "/discover",
    "/collections",
    "/ml-lab",
    "/universe",
    "/privacy",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    if (path === "/") {
      await page.screenshot({
        path: testInfo.outputPath("landing.png"),
        fullPage: true,
      });
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBe(true);
  }
});

test("search empty state and safe source attribution", async ({ page }) => {
  await page.goto("/discover");
  await page
    .getByLabel("Search music", { exact: true })
    .fill("NoSuchRecord_QA_928471");
  await expect(page.getByText(/No records on this frequency/)).toBeVisible();
  await page.getByLabel("Search music", { exact: true }).fill("");
  await expect(page.locator(".track-row").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Track license", exact: true }),
  ).toHaveAttribute("href", /^https:\/\/creativecommons.org\//);
});

test("remaining real model controls", async ({ page }) => {
  await page.goto("/ml-lab/gmm");
  const record = page.getByLabel("Inspect research record", { exact: true });
  await expect(record).toBeVisible();
  const second = await record.locator("option").nth(2).getAttribute("value");
  const secondText = await record.locator("option").nth(2).textContent();
  await record.selectOption(second ?? secondText!);
  await expect(
    page.getByText(/Posterior membership conditional.*Sum: 1.000000/),
  ).toBeVisible();
  await page.goto("/ml-lab/factors");
  const factor = page.getByLabel("Inspect factor", { exact: true });
  await expect(factor).toBeVisible();
  const lastFactor = await factor
    .locator("option")
    .last()
    .getAttribute("value");
  await factor.selectOption(lastFactor!);
  await expect(factor).toHaveValue(lastFactor!);
  await page.goto("/ml-lab/distances");
  const records = page.getByLabel("Inspect research record", { exact: true });
  await expect(records).toHaveCount(2);
  const sameRecord = await records.first().inputValue();
  await records.nth(1).selectOption(sameRecord);
  await expect(
    page.locator(".metrics").getByText("0.00000", { exact: true }),
  ).toHaveCount(2);
  await page.goto("/ml-lab/evaluation");
  const metric = page.getByLabel("Evaluation metric", { exact: true });
  await metric.selectOption("inertia");
  await expect(metric).toHaveValue("inertia");
});
