"use client";

import { CalendarClock, Loader2, XCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { changeStatusAction, rescheduleAction } from "@/app/(dashboard)/bookings/actions";
import { showDeliveryToast } from "@/components/bookings/delivery-toast";
import { SlotPicker } from "@/components/bookings/slot-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/constants";

export function BookingActions({
  bookingId,
  status,
  masterId,
  serviceId,
  isPast,
  hasTelegram,
  variant,
  salonToday,
}: {
  bookingId: string;
  status: BookingStatus;
  masterId: string;
  serviceId: string;
  isPast: boolean;
  hasTelegram: boolean;
  variant: "page" | "sheet";
  salonToday: string;
}) {
  const router = useRouter();
  const { t, tm } = useI18n();
  const statusItems = BOOKING_STATUSES.map((value) => ({ value, label: t(`status.${value}`) }));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [day, setDay] = useState(salonToday);
  const [slot, setSlot] = useState<string | null>(null);

  function setStatus(next: BookingStatus) {
    if (next === status) return;
    if (next === "cancelled") {
      setConfirmCancel(true);
      return;
    }
    startTransition(async () => {
      const result = await changeStatusAction({ bookingId, status: next });
      if (!result.ok) {
        toast.error(tm(result.error));
        return;
      }
      toast.success(t("bookings.actions.statusChanged", { status: t(`status.${next}`) }));
      router.refresh();
    });
  }

  function cancelBooking() {
    startTransition(async () => {
      const result = await changeStatusAction({ bookingId, status: "cancelled" });
      setConfirmCancel(false);
      if (!result.ok) {
        toast.error(tm(result.error));
        return;
      }
      showDeliveryToast(t("bookings.actions.cancelled"), result.delivery, t);
      router.refresh();
    });
  }

  function reschedule() {
    if (!slot) return;
    startTransition(async () => {
      const result = await rescheduleAction({ bookingId, startsAt: slot });
      if (!result.ok) {
        toast.error(tm(result.error));
        return;
      }
      setRescheduleOpen(false);
      showDeliveryToast(t("bookings.actions.rescheduled"), result.delivery, t);
      if (variant === "page") {
        router.push(`/bookings/${result.newBookingId}`);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        params.set("booking", result.newBookingId);
        router.push(`${pathname}?${params.toString()}`);
      }
      router.refresh();
    });
  }

  const active = status === "confirmed";

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <label htmlFor="booking-status" className="text-sm font-medium">
          {t("bookings.actions.status")}
        </label>
        <Select
          items={statusItems}
          value={status}
          onValueChange={(value) => value && setStatus(value as BookingStatus)}
          disabled={pending}
        >
          <SelectTrigger id="booking-status" className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {active && !isPast && (
          <div className="mt-4 grid gap-2">
            <Button variant="outline" onClick={() => setRescheduleOpen(true)} disabled={pending}>
              <CalendarClock aria-hidden />
              {t("bookings.actions.reschedule")}
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmCancel(true)}
              disabled={pending}
            >
              <XCircle aria-hidden />
              {t("bookings.actions.cancel")}
            </Button>
          </div>
        )}
        {active && (
          <p className="mt-3 text-xs text-muted-foreground">
            {hasTelegram
              ? t("bookings.actions.telegramNotice")
              : t("bookings.actions.noTelegram")}
          </p>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bookings.actions.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bookings.actions.cancelText")}
              {hasTelegram && ` ${t("bookings.actions.cancelTelegram")}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("bookings.actions.keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelBooking} disabled={pending} variant="destructive">
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("bookings.actions.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={rescheduleOpen}
        onOpenChange={(open) => {
          setRescheduleOpen(open);
          if (!open) setSlot(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bookings.actions.rescheduleTitle")}</DialogTitle>
            <DialogDescription>{t("bookings.actions.rescheduleText")}</DialogDescription>
          </DialogHeader>
          <SlotPicker
            serviceId={serviceId}
            masterId={masterId}
            excludeBookingId={bookingId}
            day={day}
            onDayChange={setDay}
            value={slot}
            onChange={setSlot}
            minDay={salonToday}
          />
          <DialogFooter>
            <Button onClick={reschedule} disabled={!slot || pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {t("bookings.actions.reschedule")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
