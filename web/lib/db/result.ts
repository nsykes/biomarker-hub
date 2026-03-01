export type SafeResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type ActionResult =
  | { success: true; error: null }
  | { success: false; error: string };
