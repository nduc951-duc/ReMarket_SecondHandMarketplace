import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel =
    theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      onClick={toggleTheme}
    >
      {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  );
}
