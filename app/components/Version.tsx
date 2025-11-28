declare const __APP_VERSION__: string;

export function Version() {
  return (
    <div className="fixed bottom-2 left-2 text-xs text-tertiary/50 select-none pointer-events-none z-10">
      v{__APP_VERSION__}
    </div>
  );
}
