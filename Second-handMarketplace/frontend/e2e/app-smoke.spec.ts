import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function attachPageScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(`${name}-${testInfo.project.name}`, {
    path,
    contentType: 'image/png',
  });
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const seriousViolations = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact || ''),
  );
  expect(seriousViolations).toEqual([]);
}

async function mockMarketplaceApi(page: Page) {
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/products/demo-product') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'demo-product',
            seller_id: 'seller-1',
            title: 'Máy ảnh mirrorless còn đẹp',
            description: 'Máy hoạt động tốt, đầy đủ pin và dây đeo.',
            price: 3_200_000,
            status: 'available',
            condition: 'good',
            category: 'Điện tử',
            location: 'TP. Hồ Chí Minh',
            images: [],
            profiles: {
              id: 'seller-1',
              full_name: 'Minh Anh',
              rating_avg: 4.8,
              rating_count: 24,
            },
          },
        }),
      });
    }

    if (url.pathname === '/api/reviews/user/seller-1') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { reviews: [], total: 0 } }),
      });
    }

    if (url.pathname === '/api/products') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { products: [], pagination: { total: 0 } } }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E2E route not mocked' }),
    });
  });
}

test('auth screen supports keyboard, persisted theme, reduced motion and WCAG checks', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mật khẩu' })).toBeVisible();
  await attachPageScreenshot(page, testInfo, 'login');

  const themeToggle = page.getByRole('button', { name: 'Chuyển sang giao diện tối' });
  await page.keyboard.press('Tab');
  await expect(themeToggle).toBeFocused();
  await themeToggle.click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const bodyTransitionSeconds = await page
    .locator('body')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(bodyTransitionSeconds).toBeLessThanOrEqual(0.001);
  await expectNoSeriousAccessibilityViolations(page);
});

test('public product detail renders responsive content from API boundaries', async ({
  page,
}, testInfo) => {
  await mockMarketplaceApi(page);
  await page.goto('/products/demo-product');

  await expect(page.getByRole('heading', { name: 'Máy ảnh mirrorless còn đẹp' })).toBeVisible();
  await expect(page.getByText('3.200.000')).toBeVisible();
  await expect(page.getByText('Minh Anh')).toBeVisible();
  await attachPageScreenshot(page, testInfo, 'product-detail');
  await expectNoSeriousAccessibilityViolations(page);
});

test('authorization guard and unknown routes land on the correct screens', async ({ page }) => {
  await page.goto('/wishlist');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();

  await page.goto('/duong-dan-khong-ton-tai');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trang này không còn ở đây' })).toBeVisible();
});

test('public layouts do not overflow the supported responsive breakpoints', async ({ page }) => {
  await mockMarketplaceApi(page);

  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/products/demo-product');
    await expect(page.getByRole('heading', { name: 'Máy ảnh mirrorless còn đẹp' })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
});
