import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

describe('FormField', () => {
  it('associates its label and description with the control', () => {
    render(
      <FormField label="Tên sản phẩm" description="Nhập tên dễ nhận biết">
        <Input />
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Tên sản phẩm' });
    const description = screen.getByText('Nhập tên dễ nhận biết');

    expect(input).toHaveAttribute('aria-describedby', description.id);
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('exposes a field error to assistive technology', () => {
    render(
      <FormField label="Giá bán" error="Giá bán phải lớn hơn 0">
        <Input type="number" />
      </FormField>,
    );

    const input = screen.getByRole('spinbutton', { name: 'Giá bán' });
    const error = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });
});
