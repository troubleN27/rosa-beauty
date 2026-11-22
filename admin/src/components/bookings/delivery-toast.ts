import { toast } from "sonner";

import type { I18n } from "@/i18n";
import type { DeliveryResult } from "@/lib/telegram";

/** Tell the admin whether the client got the Telegram message (SPEC 6.4). */
export function showDeliveryToast(done: string, delivery: DeliveryResult | null, t: I18n["t"]) {
  if (delivery === "sent") {
    toast.success(done, { description: t("bookings.delivery.sent") });
  } else if (delivery === "blocked") {
    toast.warning(done, { description: t("bookings.delivery.blocked") });
  } else if (delivery === "failed") {
    toast.warning(done, { description: t("bookings.delivery.failed") });
  } else if (delivery === "no_telegram") {
    toast.success(done, { description: t("bookings.delivery.noTelegram") });
  } else {
    toast.success(done);
  }
}
