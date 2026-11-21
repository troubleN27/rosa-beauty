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
import { BOOKING_STATUSES, STATUS_LABELS, type BookingStatus } from "@/lib/constants";

const STATUS_ITEMS = BOOKING_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));

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
        toast.error(result.error);
        return;
      }
      toast.success(`Статус: ${STATUS_LABELS[next]}`);
      router.refresh();
    });
  }

  function cancelBooking() {
    startTransition(async () => {
      const result = await changeStatusAction({ bookingId, status: "cancelled" });
      setConfirmCancel(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      showDeliveryToast("Запись отменена", result.delivery);
      router.refresh();
    });
  }

  function reschedule() {
    if (!slot) return;
    startTransition(async () => {
      const result = await rescheduleAction({ bookingId, startsAt: slot });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRescheduleOpen(false);
      showDeliveryToast("Запись перенесена", result.delivery);
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
          Статус
        </label>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => value && setStatus(value as BookingStatus)}
          disabled={pending}
        >
          <SelectTrigger id="booking-status" className="mt-2 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
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
              Перенести
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmCancel(true)}
              disabled={pending}
            >
              <XCircle aria-hidden />
              Отменить запись
            </Button>
          </div>
        )}
        {active && (
          <p className="mt-3 text-xs text-muted-foreground">
            {hasTelegram
              ? "При отмене или переносе клиент получит сообщение в Telegram."
              : "У клиента нет Telegram — об изменениях сообщите по телефону."}
          </p>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Время освободится для других клиентов.
              {hasTelegram && " Клиент получит сообщение об отмене в Telegram."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Не отменять</AlertDialogCancel>
            <AlertDialogAction onClick={cancelBooking} disabled={pending} variant="destructive">
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Отменить запись
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
            <DialogTitle>Перенос записи</DialogTitle>
            <DialogDescription>Тот же мастер и услуга. Показано только свободное время.</DialogDescription>
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
              Перенести
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
