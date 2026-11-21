import { toast } from "sonner";

import type { DeliveryResult } from "@/lib/telegram";

/** Tell the admin whether the client got the Telegram message (SPEC 6.4). */
export function showDeliveryToast(done: string, delivery: DeliveryResult | null) {
  if (delivery === "sent") {
    toast.success(done, { description: "Клиент получил сообщение в Telegram." });
  } else if (delivery === "blocked") {
    toast.warning(done, { description: "Клиент заблокировал бота — сообщение не доставлено. Позвоните клиенту." });
  } else if (delivery === "failed") {
    toast.warning(done, { description: "Сообщение клиенту не отправлено. Сообщите об изменении по телефону." });
  } else if (delivery === "no_telegram") {
    toast.success(done, { description: "У клиента нет Telegram — сообщите об изменении по телефону." });
  } else {
    toast.success(done);
  }
}
