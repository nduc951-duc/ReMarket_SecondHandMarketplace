import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

async function attachPageScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path });
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
            description:
              'Máy hoạt động ổn định, cảm biến sạch và ngoại hình còn đẹp.\n\nĐi kèm pin, sạc, dây đeo và hộp. Người mua có thể kiểm tra máy trực tiếp trước khi nhận.',
            price: 3_200_000,
            status: 'active',
            condition: 'good',
            category: 'Điện tử',
            location: 'TP. Hồ Chí Minh',
            view_count: 128,
            is_negotiable: true,
            created_at: '2026-07-28T09:00:00.000Z',
            updated_at: '2026-07-30T14:30:00.000Z',
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

async function useDemoSession(page: Page, role: 'customer' | 'agent' | 'admin' = 'customer') {
  const userId = `e2e-${role}`;
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, role: 'authenticated', exp: 4102444800 }),
  ).toString('base64url');
  const accessToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.e2e-signature`;

  await page.addInitScript(
    ({ sessionRole, sessionUserId, token }) => {
      localStorage.setItem(
        'sb-127-auth-token',
        JSON.stringify({
          access_token: token,
          refresh_token: 'e2e-refresh-token',
          expires_at: 4102444800,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: sessionUserId,
            aud: 'authenticated',
            role: 'authenticated',
            email: `${sessionRole}@test.com`,
            app_metadata: { provider: 'email', role: sessionRole },
            user_metadata: { full_name: `Demo ${sessionRole}` },
            created_at: '2026-01-01T00:00:00.000Z',
          },
        }),
      );
    },
    { sessionRole: role, sessionUserId: userId, token: accessToken },
  );
}

async function mockAuthenticatedApi(page: Page) {
  await page.route('http://localhost:4000/api/**', async (route) => {
    const url = new URL(route.request().url());
    const emptyData = url.pathname.includes('/stats')
      ? {}
      : url.pathname.includes('/profile')
        ? {
            id: 'e2e-customer',
            full_name: 'Tài khoản demo',
            email: 'customer@test.com',
          }
        : url.pathname.includes('/wishlist')
          ? { items: [], pagination: { total: 0 } }
          : url.pathname.includes('/transactions')
            ? { transactions: [], pagination: { total: 0 } }
            : url.pathname.includes('/notifications')
              ? { notifications: [], unread: 0, pagination: { total: 0 } }
              : url.pathname.includes('/conversations')
                ? { conversations: [], unread: 0 }
                : url.pathname.includes('/products/user/my')
                  ? { products: [], pagination: { total: 0 } }
                  : [];

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: emptyData }),
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
  await expect(page.getByRole('button', { name: 'Mở trợ lý AI' })).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: 'Thông tin sản phẩm' })).toBeVisible();
  await expect(page.getByText('Có thể thương lượng').first()).toBeVisible();
  await expect(page.getByText('128 lượt xem')).toBeVisible();
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

test('public auth and system screens render without horizontal overflow', async ({ page }) => {
  for (const path of [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/403',
    '/500',
  ]) {
    await page.goto(path);
    await expect(page.locator('main').last()).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${path} must not overflow horizontally`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }
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

test('authenticated marketplace screens keep navigation clear and content unobstructed', async ({
  page,
}) => {
  await useDemoSession(page);
  await mockAuthenticatedApi(page);

  for (const path of [
    '/app',
    '/search',
    '/wishlist',
    '/my-products',
    '/seller/dashboard',
    '/transactions',
    '/chat',
    '/notifications',
    '/profile',
    '/change-password',
    '/products/new',
    '/products/demo-product/edit',
    '/support-chat',
  ]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByText('Đang kiểm tra phiên đăng nhập…')).toBeHidden();
    await expect(page.locator('main').last()).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `${path} must not overflow horizontally`).toBeLessThanOrEqual(
      dimensions.viewport,
    );

    if (['/app', '/chat', '/profile'].includes(path)) {
      await expectNoSeriousAccessibilityViolations(page);
    }
  }
});

test('admin and moderation screens remain reachable for their demo roles', async ({ page }) => {
  await useDemoSession(page, 'admin');
  await mockAuthenticatedApi(page);

  for (const path of ['/admin/dashboard', '/agent/inbox', '/moderation']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
    await expect(page.getByText('Đang kiểm tra phiên đăng nhập…')).toBeHidden();
    await expect(page.locator('main').last()).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  }
});
