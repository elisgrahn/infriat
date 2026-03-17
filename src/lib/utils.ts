import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a user-friendly error message from a Supabase function invocation error.
 * supabase.functions.invoke() wraps errors in various shapes — this normalises them.
 */
export async function extractFunctionError(error: unknown): Promise<string> {
  if (!error) return 'Okänt fel';

  // FunctionsHttpError contains a Response-like context with JSON body
  if (error instanceof Error && 'context' in error) {
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) return body.error;
      }
    } catch { /* fall through */ }
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  return String(error);
}
