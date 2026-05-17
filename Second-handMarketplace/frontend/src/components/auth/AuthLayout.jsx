import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquare, ListChecks } from 'lucide-react';

function AuthLayout({ title, subtitle, alternateLabel, alternateAction, alternatePath, children }) {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-slate-200 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <section className="w-full max-w-5xl bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Aside */}
        <aside className="w-full md:w-5/12 bg-[#0d1117]/50 p-8 md:p-12 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-purple-500"></div>
          
          <Link to="/app" className="inline-flex items-center gap-2 mb-8 group w-fit">
            <span className="text-2xl drop-shadow-[0_0_10px_rgba(0,212,180,0.5)]">🏪</span>
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-teal-400 to-purple-500 bg-clip-text text-transparent">ReMarket</span>
          </Link>
          
          <h1 className="text-3xl font-display font-bold text-white leading-tight mb-4">
            Mua bán đồ cũ theo cách hiện đại, an toàn hơn.
          </h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Nền tảng kết nối người mua và người bán trong cộng đồng, giúp giao dịch nhanh và đáng tin cậy.
          </p>
          <ul className="flex flex-col gap-5 text-sm text-slate-300 font-medium">
            <li className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg"><ShieldCheck size={20} className="text-teal-400" /></div>
              Xác thực tài khoản rõ ràng
            </li>
            <li className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg"><MessageSquare size={20} className="text-teal-400" /></div>
              Chat trực tiếp với người bán
            </li>
            <li className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg"><ListChecks size={20} className="text-teal-400" /></div>
              Theo dõi trạng thái đơn hàng minh bạch
            </li>
          </ul>
        </aside>

        {/* Right Form */}
        <section className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center" aria-label={title}>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 mb-8">{subtitle}</p>

          <div className="[&_.form-field]:flex [&_.form-field]:flex-col [&_.form-field]:gap-2 [&_.form-field]:text-sm [&_.form-field]:font-medium [&_.form-field]:text-slate-300 [&_.form-field]:mb-4
                         [&_input]:w-full [&_input]:bg-[#0d1117] [&_input]:border [&_input]:border-white/10 [&_input]:rounded-xl [&_input]:px-4 [&_input]:py-3 [&_input]:text-white [&_input]:focus:border-teal-500 [&_input]:focus:ring-1 [&_input]:focus:ring-teal-500 [&_input]:outline-none [&_input]:transition-all
                         [&_.btn-primary]:w-full [&_.btn-primary]:py-3.5 [&_.btn-primary]:rounded-xl [&_.btn-primary]:font-bold [&_.btn-primary]:bg-gradient-to-r [&_.btn-primary]:from-teal-500 [&_.btn-primary]:to-teal-400 [&_.btn-primary]:text-slate-950 [&_.btn-primary]:mt-6 [&_.btn-primary]:hover:shadow-[0_0_20px_rgba(0,212,180,0.3)] [&_.btn-primary]:transition-all [&_.btn-primary:disabled]:opacity-50
                         [&_.btn-google]:w-full [&_.btn-google]:py-3.5 [&_.btn-google]:rounded-xl [&_.btn-google]:font-bold [&_.btn-google]:bg-white [&_.btn-google]:text-slate-900 [&_.btn-google]:mt-4 [&_.btn-google]:border [&_.btn-google]:border-slate-200 [&_.btn-google]:hover:bg-slate-50 [&_.btn-google]:transition-colors [&_.btn-google:disabled]:opacity-50
                         [&_.auth-inline-links]:text-right [&_.auth-inline-links]:mb-2 [&_.text-link]:text-sm [&_.text-link]:text-teal-400 [&_.text-link]:hover:text-teal-300 [&_.text-link]:font-medium
                         [&_.form-feedback]:p-3 [&_.form-feedback]:rounded-xl [&_.form-feedback]:text-sm [&_.form-feedback]:font-medium [&_.form-feedback]:mt-4 [&_.form-feedback]:border
                         [&_.form-feedback.success]:bg-teal-500/10 [&_.form-feedback.success]:text-teal-400 [&_.form-feedback.success]:border-teal-500/20
                         [&_.form-feedback.error]:bg-rose-500/10 [&_.form-feedback.error]:text-rose-400 [&_.form-feedback.error]:border-rose-500/20
                         [&_.field-error]:text-rose-400 [&_.field-error]:text-xs [&_.field-error]:mt-1
                         [&_.btn-resend]:w-full [&_.btn-resend]:py-3 [&_.btn-resend]:rounded-xl [&_.btn-resend]:font-semibold [&_.btn-resend]:bg-purple-500/10 [&_.btn-resend]:text-purple-400 [&_.btn-resend]:mt-4 [&_.btn-resend]:border [&_.btn-resend]:border-purple-500/20 [&_.btn-resend]:hover:bg-purple-500/20 [&_.btn-resend]:transition-colors">
            {children}
          </div>

          <p className="mt-8 text-center text-sm text-slate-400">
            {alternateLabel}{' '}
            <Link to={alternatePath} className="font-bold text-teal-400 hover:text-teal-300 transition-colors">
              {alternateAction}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default AuthLayout;
