import { Link } from "react-router";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">memoria</span>
        </Link>
        <div className="flex-1" />
      </div>
    </header>
  );
}
