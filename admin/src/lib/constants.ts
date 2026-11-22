export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ["bot", "admin"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** Who changed a booking status (booking_status_history.changed_by). */
export const CHANGED_BY = ["client", "admin"] as const;

/** Tabs of the master page; labels are in the dictionaries (masters.tabs.*). */
export const MASTER_TABS = ["profile", "photo", "services", "schedule", "timeoff"] as const;
export type MasterTab = (typeof MASTER_TABS)[number];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function isBookingSource(value: string): value is BookingSource {
  return (BOOKING_SOURCES as readonly string[]).includes(value);
}
