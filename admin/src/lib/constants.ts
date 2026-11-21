export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: "Подтверждена",
  completed: "Выполнена",
  cancelled: "Отменена",
  no_show: "Неявка",
};

export const BOOKING_SOURCES = ["bot", "admin"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const SOURCE_LABELS: Record<BookingSource, string> = {
  bot: "Бот",
  admin: "Админка",
};

export const CHANGED_BY_LABELS: Record<string, string> = {
  client: "Клиент",
  admin: "Администратор",
};
