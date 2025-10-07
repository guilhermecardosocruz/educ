import Brand from "./Brand";

type AuthLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Lado esquerdo: destaque/branding */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[var(--color-secondary,#0A66FF)] text-white p-10">
        <Brand className="text-white" />
        <p className="mt-4 max-w-md text-center opacity-90">
          Plataforma para organizar turmas, chamadas e conteúdos com simplicidade.
        </p>
      </div>

      {/* Lado direito: conteúdo (form/card) */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          <div className="mt-6 rounded-2xl border p-6 shadow-sm bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
