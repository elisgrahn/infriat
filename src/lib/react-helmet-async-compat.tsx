/**
 * Compat shim: react-helmet-async → no-op.
 *
 * Per-route metadata is now handled by TanStack Start route `head()` exports.
 * Components using <Helmet> still render, but their tags are dropped.
 * Migrate them to route head() incrementally for proper SSR metadata.
 */
import type { ReactNode } from "react";

export const Helmet = (_props: { children?: ReactNode }) => null;
export const HelmetProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const HelmetData = class {};
