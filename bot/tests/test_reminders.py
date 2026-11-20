from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from app.scheduler import ReminderKind, reminder_plan, review_moment
from app.services.booking import can_client_change

VISIT = datetime(2026, 12, 10, 12, 0, tzinfo=UTC)
H = timedelta(hours=1)


def test_both_reminders_for_booking_made_in_advance() -> None:
    plan = reminder_plan(VISIT, created_at=VISIT - 72 * H, now=VISIT - 48 * H)
    assert plan == {ReminderKind.H24: VISIT - 24 * H, ReminderKind.H2: VISIT - 2 * H}


def test_no_24h_reminder_when_booked_less_than_24h_ahead() -> None:
    plan = reminder_plan(VISIT, created_at=VISIT - 10 * H, now=VISIT - 10 * H)
    assert plan == {ReminderKind.H2: VISIT - 2 * H}


def test_no_reminders_when_booked_less_than_2h_ahead() -> None:
    assert reminder_plan(VISIT, created_at=VISIT - 90 * timedelta(minutes=1), now=VISIT - H) == {}


def test_bot_was_down_2h_reminder_sent_now() -> None:
    now = VISIT - H  # both moments passed, visit not started
    plan = reminder_plan(VISIT, created_at=VISIT - 72 * H, now=now)
    assert plan == {ReminderKind.H2: now}  # 24 h skipped: less than 2 h left


def test_bot_was_down_24h_reminder_sent_now_if_2h_or_more_left() -> None:
    now = VISIT - 5 * H
    plan = reminder_plan(VISIT, created_at=VISIT - 72 * H, now=now)
    assert plan == {ReminderKind.H24: now, ReminderKind.H2: VISIT - 2 * H}


def test_already_sent_reminders_are_not_planned_again() -> None:
    plan = reminder_plan(
        VISIT,
        created_at=VISIT - 72 * H,
        now=VISIT - 5 * H,
        already_sent=frozenset({ReminderKind.H24}),
    )
    assert plan == {ReminderKind.H2: VISIT - 2 * H}


def test_nothing_after_visit_started() -> None:
    assert reminder_plan(VISIT, created_at=VISIT - 72 * H, now=VISIT) == {}


def test_review_moment() -> None:
    ends = VISIT + H
    assert review_moment(ends, now=VISIT) == ends + 2 * H
    late = ends + 10 * H
    assert review_moment(ends, now=late) == late


def _booking(status: str = "confirmed"):
    return SimpleNamespace(status=status, starts_at=VISIT)


def test_client_can_change_until_deadline() -> None:
    settings = SimpleNamespace(cancel_deadline_hours=3)
    assert can_client_change(_booking(), settings, VISIT - 3 * H)
    assert not can_client_change(_booking(), settings, VISIT - 3 * H + timedelta(seconds=1))
    assert not can_client_change(_booking("cancelled"), settings, VISIT - 48 * H)
