import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Select } from '@/components/ui/select';

describe('Select', () => {
  it('keeps native dropdown options readable in dark theme', () => {
    render(
      <Select aria-label="Danh mục">
        <option value="camera">Máy ảnh</option>
      </Select>,
    );

    const select = screen.getByRole('combobox', { name: 'Danh mục' });
    expect(select).toHaveClass('dark:[color-scheme:dark]');
    expect(select).toHaveClass('[&>option]:bg-popover');
    expect(select).toHaveClass('[&>option]:text-popover-foreground');
  });
});
