import { isBookingStatus, type BookingStatus } from "@/lib/constants";

/**
 * Status hues (see globals.css): confirmed plum, completed sage, cancelled taupe, no-show terracotta,
 * redefined for the dark theme. Shared by server (schedule) and client (badges) components.
 */
export const STATUS_STYLES: Record<BookingStatus, { badge: string }> = {
  confirmed: { badge: "status-confirmed" },
  completed: { badge: "status-completed" },
  cancelled: { badge: "status-cancelled" },
  no_show: { badge: "status-no-show" },
};

export function statusKey(status: string): BookingStatus {
  return isBookingStatus(status) ? status : "confirmed";
}
