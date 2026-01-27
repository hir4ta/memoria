import { Link } from "react-router";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-2">
        <div className="flex h-12 items-center justify-between rounded-xl border border-border/70 bg-white/70 px-4 backdrop-blur-md dark:bg-gray-900/70">
          <Link to="/" className="flex items-center font-semibold">
            <span className="text-2xl tracking-tight">memoria</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
