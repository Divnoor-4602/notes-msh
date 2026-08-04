import { useEffect, useState } from "react";
import { ClaimPage } from "./components/ClaimPage";
import { AdminPage } from "./components/admin/AdminPage";

/**
 * Two screens, so a full router would be more moving parts than it is worth.
 * The static hosting component falls back to index.html, so /admin loads the
 * SPA and this picks the view.
 */
function usePathname(): string {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return pathname;
}

export default function App() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <AdminPage />;
  }
  return <ClaimPage />;
}
