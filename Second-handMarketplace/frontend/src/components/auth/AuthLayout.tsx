import { CheckCircle2, MessageSquare, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  alternateLabel: string;
  alternateAction: string;
  alternatePath: string;
}

function AuthLayout({
  title,
  subtitle,
  alternateLabel,
  alternateAction,
  alternatePath,
  children,
}: AuthLayoutProps) {
  return (
    <main className="relative grid min-h-screen bg-background text-foreground lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute right-4 top-4 z-20 rounded-full border border-border bg-background/85 shadow-sm backdrop-blur">
        <ThemeToggle />
      </div>

      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-28 -top-28 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 size-96 rounded-full bg-black/10 blur-3xl" />
        <Link to="/app" className="relative inline-flex w-fit items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
            <ShoppingBag className="size-6" />
          </span>
          <span className="text-2xl font-bold">ReMarket</span>
        </Link>

        <section className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Marketplace đáng tin cậy
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight xl:text-5xl">
            Trao món đồ cũ một hành trình mới.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/75">
            Mua bán minh bạch, trò chuyện trực tiếp và theo dõi từng bước giao dịch trong một trải
            nghiệm gọn gàng.
          </p>
          <ul className="mt-9 grid gap-4 text-sm">
            {[
              [ShieldCheck, 'Tài khoản và quyền truy cập được bảo vệ'],
              [MessageSquare, 'Trao đổi realtime với người mua và người bán'],
              [CheckCircle2, 'Trạng thái đơn hàng rõ ràng, dễ theo dõi'],
            ].map(([Icon, label]) => (
              <li key={label as string} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                  <Icon className="size-4" />
                </span>
                {label as string}
              </li>
            ))}
          </ul>
        </section>

        <p className="relative text-xs text-primary-foreground/60">
          Mua sắm bền vững hơn, bắt đầu từ những lựa chọn nhỏ.
        </p>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-4 py-20 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/app"
            className="mb-10 inline-flex items-center gap-2 text-xl font-bold lg:hidden"
          >
            <ShoppingBag className="size-5 text-primary" />
            ReMarket
          </Link>
          <p className="text-sm font-semibold text-primary">Tài khoản ReMarket</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {alternateLabel}{' '}
            <Link to={alternatePath} className="font-semibold text-primary hover:underline">
              {alternateAction}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export { AuthLayout };
export default AuthLayout;
