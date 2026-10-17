import { CredentialsSignin } from "next-auth";

/**
 * Typed credential errors. NextAuth surfaces `code` to the client (`signIn(...).code`)
 * so the login form can show a specific, safe message.
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export class TooManyAttemptsError extends CredentialsSignin {
  code = "rate_limited";
}
