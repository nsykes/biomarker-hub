/** Intentionally thrown with a user-safe message. The extract route treats
 *  `UserError.message` as display-safe; other errors are surfaced generically
 *  to avoid leaking stack traces or internal details. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
