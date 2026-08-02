import { describe, expect, it } from 'vitest';

import { getLoginErrorMessage } from '@/services/authService';

describe('getLoginErrorMessage', () => {
  it('translates invalid Supabase credentials without revealing which field exists', () => {
    expect(getLoginErrorMessage('Invalid login credentials')).toBe(
      'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.',
    );
  });

  it('provides a useful Vietnamese message for rate limiting', () => {
    expect(getLoginErrorMessage('Too many requests')).toContain('quá nhiều lần');
  });

  it('does not expose unknown provider errors', () => {
    expect(getLoginErrorMessage('upstream internal detail')).toBe(
      'Không thể đăng nhập. Vui lòng thử lại.',
    );
  });
});
