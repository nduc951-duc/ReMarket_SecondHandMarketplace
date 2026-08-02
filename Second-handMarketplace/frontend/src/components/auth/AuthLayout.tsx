import { ArrowUpRight } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

import remarketLogo from '@/assets/remarket-logo.svg';
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
    <main className="relative grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]">
      <div className="absolute right-4 top-4 z-20 rounded-lg border border-border bg-background/90 backdrop-blur">
        <ThemeToggle />
      </div>

      <aside className="hidden border-r border-border bg-muted/30 px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
        <Link to="/app" className="inline-flex w-fit items-center gap-3" aria-label="ReMarket">
          <img src={remarketLogo} alt="" width="44" height="44" className="size-11 rounded-xl" />
          <span className="text-2xl font-bold tracking-tight">ReMarket</span>
        </Link>

        <section className="max-w-2xl py-16">
          <p className="text-sm font-semibold text-primary">Mua và bán, rõ ràng ngay từ đầu</p>
          <h2 className="mt-5 max-w-xl text-balance text-5xl font-bold leading-[1.05] tracking-[-0.045em] xl:text-6xl">
            Đồ còn tốt không nên bị bỏ quên.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Tìm món phù hợp, nói chuyện trực tiếp và theo dõi giao dịch trong một nơi.
          </p>

          <dl className="mt-12 grid max-w-xl grid-cols-3 border-y border-border py-6">
            {[
              ['01', 'Đăng tin'],
              ['02', 'Trao đổi'],
              ['03', 'Giao dịch'],
            ].map(([number, label]) => (
              <div key={number} className="border-l border-border px-4 first:border-l-0 first:pl-0">
                <dt className="text-xs font-semibold tabular-nums text-primary">{number}</dt>
                <dd className="mt-2 text-sm font-semibold">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Link
          to="/register"
          className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Bắt đầu với một tài khoản
          <ArrowUpRight className="size-4 transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </aside>

      <section className="flex min-h-screen items-center justify-center bg-card px-5 py-20 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            to="/app"
            className="mb-12 inline-flex items-center gap-2.5 text-xl font-bold tracking-tight lg:hidden"
            aria-label="ReMarket"
          >
            <img src={remarketLogo} alt="" width="36" height="36" className="size-9 rounded-lg" />
            ReMarket
          </Link>
          <p className="text-sm font-semibold text-primary">Tiếp tục với tài khoản của bạn</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.035em]">{title}</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-9">{children}</div>
          <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
            {alternateLabel}{' '}
            <Link
              to={alternatePath}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
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
