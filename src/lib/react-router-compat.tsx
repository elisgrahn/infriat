/**
 * Compat shim: maps `react-router-dom` imports to TanStack Router equivalents
 * so the existing page/component code keeps working without a full rewrite.
 *
 * Wired in via `vite.config.ts` resolve.alias.
 */
import {
  Link as TLink,
  Outlet as TOutlet,
  useNavigate as tUseNavigate,
  useParams as tUseParams,
  useRouterState,
  useRouter,
} from "@tanstack/react-router";
import { forwardRef, type ComponentProps, type ReactNode } from "react";

// ---------- Components ----------

export const Outlet = TOutlet;

type LinkProps = Omit<ComponentProps<"a">, "href"> & {
  to: string | { pathname?: string; search?: string; hash?: string };
  replace?: boolean;
  state?: unknown;
  end?: boolean;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state: _state, end: _end, ...rest },
  ref,
) {
  const href =
    typeof to === "string"
      ? to
      : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}` || "/";
  return (
    <TLink ref={ref as any} to={href as any} replace={replace} {...(rest as any)} />
  );
});

export const NavLink = Link;

export const BrowserRouter = ({ children }: { children: ReactNode }) => <>{children}</>;
export const HashRouter = BrowserRouter;
export const MemoryRouter = BrowserRouter;

// Routes/Route/Navigate are only referenced from the old src/router.tsx which
// we no longer use, but export stubs so accidental imports don't crash builds.
export const Routes = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const Route = (_: any) => null;
export const Navigate = (_: { to: string; replace?: boolean }) => null;

// ---------- Hooks ----------

type NavigateOptions = { replace?: boolean; state?: unknown };
type To = string | number | { pathname?: string; search?: string; hash?: string };

export function useNavigate() {
  const nav = tUseNavigate();
  return (to: To, opts: NavigateOptions = {}) => {
    if (typeof to === "number") {
      if (typeof window !== "undefined") window.history.go(to);
      return;
    }
    const href =
      typeof to === "string"
        ? to
        : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}` || "/";
    nav({ to: href as any, replace: opts.replace });
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return tUseParams({ strict: false }) as T;
}

export function useLocation() {
  const location = useRouterState({ select: (s) => s.location });
  return {
    pathname: location.pathname,
    search: location.searchStr ?? "",
    hash: location.hash ?? "",
    state: (location.state as any) ?? {},
    key: location.href,
  };
}

type SearchParamsSetter = (
  next:
    | URLSearchParams
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams),
  opts?: { replace?: boolean },
) => void;

export function useSearchParams(): [URLSearchParams, SearchParamsSetter] {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const router = useRouter();
  const params = new URLSearchParams(searchStr);

  const setSearchParams: SearchParamsSetter = (next, opts) => {
    let result: URLSearchParams;
    if (typeof next === "function") {
      result = next(new URLSearchParams(searchStr));
    } else if (next instanceof URLSearchParams) {
      result = next;
    } else {
      result = new URLSearchParams(next);
    }
    const search = Object.fromEntries(result.entries());
    router.navigate({
      to: ".",
      search: () => search as any,
      replace: opts?.replace ?? false,
    });
  };

  return [params, setSearchParams];
}

// react-router-dom v6 also exports useMatches / useMatch — add as no-ops if needed later.
