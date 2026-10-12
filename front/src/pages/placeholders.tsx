export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-extrabold">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground">La ruta que buscás no existe.</p>
      <a href="/login" className="min-h-[44px] content-center text-sm font-bold text-primary hover:underline">
        Volver al inicio de sesión
      </a>
    </main>
  );
}
