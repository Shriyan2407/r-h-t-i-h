export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured (set RESEND_API_KEY and EMAIL_FROM)");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailDeliveryError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = status;
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Send a transactional email through Resend's HTTP API.
 *
 * - Production without credentials: throws EmailNotConfiguredError. Silently dropping
 *   verification or reset emails would leave users locked out with no signal.
 * - Development without credentials: prints the message to the console instead.
 */
export async function sendEmail(
  message: EmailMessage,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    if (env.NODE_ENV === "production") throw new EmailNotConfiguredError();
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  const res = await fetchImpl(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    // Do not include the response body: it can echo the recipient address.
    throw new EmailDeliveryError(`Email provider rejected the message (${res.status})`, res.status);
  }
}
