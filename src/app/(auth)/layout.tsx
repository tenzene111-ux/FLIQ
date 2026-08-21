export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 0%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(34,211,238,0.25), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(236,72,153,0.25), transparent 60%)",
        }}
      />
      <div className="relative z-10 flex-1 flex flex-col">{children}</div>
    </div>
  );
}
