import "server-only";

export type DeliveryResult = "sent" | "blocked" | "no_telegram" | "failed";

/**
 * Send an HTML message to a client through the Telegram Bot API.
 * Never throws: the admin action has already been saved, delivery is best effort.
 */
export async function sendToClient(chatId: number | null, html: string): Promise<DeliveryResult> {
  if (chatId === null) return "no_telegram";
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set: client message not sent");
    return "failed";
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "sent";
    // 403: the client blocked the bot
    if (response.status === 403) return "blocked";
    console.error("Telegram sendMessage failed", response.status, await response.text());
    return "failed";
  } catch (error) {
    console.error("Telegram sendMessage error", error);
    return "failed";
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
