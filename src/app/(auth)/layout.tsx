const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-light-secondary/40 dark:bg-dark-secondary/40">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-black/80 dark:text-white/80">
              Sora AI
            </h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Sign in to gain more insights into tax advisory and compliance with Sora AI.
            </p>
          </div>
          <div className="rounded-xl border border-light-200/60 bg-light-primary/80 p-6 shadow-sm backdrop-blur-lg dark:border-dark-200/60 dark:bg-dark-primary/80">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
