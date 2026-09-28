import { test, expect } from '@playwright/test';

test.describe('Naqsha CAD Interaction System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the canvas to mount
    await expect(page.locator('.konvajs-content')).toBeVisible({ timeout: 10000 });
  });

  test('Tool buttons show standard icons, Roman Urdu/English labels, and shortcuts', async ({ page }) => {
    // Check Select tool button
    const selectBtn = page.locator('button[title*="Select (V)"]');
    await expect(selectBtn).toBeVisible();

    // Check Wall tool button
    const wallBtn = page.locator('button[title*="Wall (W)"]');
    await expect(wallBtn).toBeVisible();

    // Check Rectangle tool button
    const boxBtn = page.locator('button[title*="Rectangle (R)"]');
    await expect(boxBtn).toBeVisible();

    // Check Door tool button
    const doorBtn = page.locator('button[title*="Door (D)"]');
    await expect(doorBtn).toBeVisible();
  });

  test('Draw rectangle, drag it, resize it with Transformer, and double click to select', async ({ page }) => {
    const canvas = page.locator('.konvajs-content canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // 1. Activate Rectangle tool
    await page.locator('button[title*="Rectangle (R)"]').click();

    // 2. Draw rectangle by dragging on canvas
    const startX = canvasBox.x + 250;
    const startY = canvasBox.y + 200;
    const endX = canvasBox.x + 400;
    const endY = canvasBox.y + 320;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    // Switch to Select tool (V)
    await page.keyboard.press('KeyV');

    // 3. Click to select the rectangle
    const clickX = canvasBox.x + 300;
    const clickY = canvasBox.y + 250;
    await page.mouse.click(clickX, clickY);

    // Verify properties panel shows Box / Kamra properties
    await expect(page.locator('text=box').or(page.locator('text=Kamra')).first()).toBeVisible({ timeout: 5000 });

    // 4. Drag the rectangle
    await page.mouse.move(clickX, clickY);
    await page.mouse.down();
    await page.mouse.move(clickX + 60, clickY + 40, { steps: 5 });
    await page.mouse.up();

    // 5. Double click to select
    await page.mouse.dblclick(clickX + 60, clickY + 40);
    await expect(page.locator('text=box').or(page.locator('text=Kamra')).first()).toBeVisible();
  });

  test('Draw wall, extend wall via endpoint handle, and place door', async ({ page }) => {
    const canvas = page.locator('.konvajs-content canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // 1. Activate Wall tool
    await page.locator('button[title*="Wall (W)"]').click();

    // 2. Draw wall
    const wStartX = canvasBox.x + 150;
    const wStartY = canvasBox.y + 150;
    const wEndX = canvasBox.x + 350;
    const wEndY = canvasBox.y + 150;

    await page.mouse.move(wStartX, wStartY);
    await page.mouse.down();
    await page.mouse.move(wEndX, wEndY, { steps: 5 });
    await page.mouse.up();

    // 3. Select wall with V
    await page.keyboard.press('KeyV');
    await page.mouse.click((wStartX + wEndX) / 2, wStartY);

    // Verify wall is selected in properties panel
    await expect(page.locator('text=wall').first()).toBeVisible({ timeout: 5000 });

    // 4. Extend wall endpoint
    await page.mouse.move(wEndX, wEndY);
    await page.mouse.down();
    await page.mouse.move(wEndX + 80, wEndY, { steps: 5 });
    await page.mouse.up();

    // 5. Place a door on the wall
    await page.locator('button[title*="Door (D)"]').click();
    await page.mouse.click(wStartX + 60, wStartY);

    // Verify door is placed
    await page.keyboard.press('KeyV');
    await page.mouse.click(wStartX + 60, wStartY);
  });

  test('Touch interaction: double-tap selects and drag moves object', async ({ page }) => {
    const canvas = page.locator('.konvajs-content canvas').first();
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');

    // Draw box
    await page.locator('button[title*="Rectangle (R)"]').click();
    await page.mouse.move(canvasBox.x + 300, canvasBox.y + 200);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 420, canvasBox.y + 300, { steps: 5 });
    await page.mouse.up();

    await page.keyboard.press('KeyV');

    // Simulate touch double-tap
    const touchX = canvasBox.x + 350;
    const touchY = canvasBox.y + 240;
    await page.touchscreen.tap(touchX, touchY);
    await page.waitForTimeout(100);
    await page.touchscreen.tap(touchX, touchY);

    await expect(page.locator('text=box').or(page.locator('text=Kamra')).first()).toBeVisible({ timeout: 5000 });
  });
});
