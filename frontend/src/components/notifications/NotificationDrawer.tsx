import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "../sheets/BottomSheet";
import { useUiStore } from "../../store/uiStore";
import { useNotifications } from "../../hooks/useNotifications";
import { markNotificationsRead } from "../../services/api/notifications";
import { fmtAgo, fmtClock, fmtDate } from "../../utils/time";
import type { Notification } from "../../types";

/**
 * The row already knew its own kind and read-state; neither was being shown.
 * `booking_done` is your own wash finishing, `collect_reminder` is a neighbour
 * waiting on you — the second is the one that needs acting on, so it carries
 * the urgent tint and a bell rather than another green tick.
 */
const KIND = {
  booking_done: {
    wrap: "bg-success-bg text-success-ic",
    path: ["M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0", "M8 12l2.5 2.5L16 9"],
  },
  collect_reminder: {
    wrap: "bg-danger-bg text-danger-ic",
    path: [
      "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9",
      "M10.3 21a1.94 1.94 0 0 0 3.4 0",
    ],
  },
} as const;

/** Groups newest-first rows under Today / Yesterday / date headings. */
function groupByDay(items: Notification[]): [string, Notification[]][] {
  const out: [string, Notification[]][] = [];
  for (const n of items) {
    const day = fmtDate(n.createdAt);
    const last = out[out.length - 1];
    if (last && last[0] === day) last[1].push(n);
    else out.push([day, [n]]);
  }
  return out;
}

export function NotificationDrawer() {
  const open = useUiStore((s) => s.notifOpen);
  const close = useUiStore((s) => s.closeNotif);
  const { data } = useNotifications();
  const qc = useQueryClient();
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handleOpen() {
    if (data && data.unread > 0) markRead.mutate();
  }

  return (
    // The same sheet the machine screens use, in its tall form — the drawer had
    // been carrying its own overlay, slide animation and panel, which meant two
    // implementations to keep in step and only this one lacked drag-to-dismiss,
    // the scroll lock and Escape.
    <BottomSheet open={open} onClose={close} tall>
      <div onAnimationEnd={handleOpen} className="flex min-h-0 flex-1 flex-col">
        {/* No close button: the sheet dismisses by dragging the handle, tapping
          the backdrop, or Escape. A fourth affordance for the same action was
          just clutter at the top of the list. */}
        {/* The bell sits above the title and shares its left edge, so both
                line up on the same margin as the rows below. Decorative: the
                heading under it already names the sheet, so alt stays empty
                rather than repeating "Notifications" to a screen reader.
                Intrinsic size is set so the header does not reflow once it
                decodes, and the art is stored at 3x the rendered height to
                stay sharp on dense screens. */}
        <div className="flex flex-col items-start gap-1.5 border-b border-cream-150 px-5 pb-4 pt-1">
          <img
            src="/img/notification_bell_icon.png"
            alt=""
            width={55}
            height={56}
            className="h-14 w-auto"
          />
          <span className="text-lg font-bold text-cream-900 tracking-[0.2px]">
            Notifications
          </span>
        </div>
        {/* `overscroll-y-contain` keeps the gesture in the list. Chained to the
            page behind -- which is scroll-locked while the sheet is open -- a
            swipe that begins at either end of the list is handed to a container
            that cannot move, so it does nothing at all. PullToRefresh already
            contains its overscroll for the same reason. */}
        <div className="scrollbar-none flex-1 overflow-y-auto overscroll-y-contain py-2">
          {data && data.notifications.length > 0 ? (
            groupByDay(data.notifications).map(([day, rows]) => (
              <section key={day}>
                {/* Sticky so the day stays named while you scroll a long
                        list — otherwise "19 hrs ago" is the only anchor. */}
                {/* Opaque rather than translucent+blurred. A backdrop-filter on a
                    sticky element re-blurs the scrolling content behind it every
                    frame, which is a well-known source of scroll stutter on
                    mid-range phones. At 92% white over white it was buying
                    almost no visual difference for that cost. */}
                <div className="sticky top-0 z-10 bg-white px-5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cream-500">
                  {day}
                </div>
                {rows.map((n) => {
                  const kind = KIND[n.type] ?? KIND.booking_done;
                  return (
                    <div
                      key={n._id}
                      className={`flex gap-3 px-5 py-3 ${n.read ? "" : "bg-brand-lt/45"}`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-[11px] ${kind.wrap}`}
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {kind.path.map((d) => (
                            <path key={d} d={d} />
                          ))}
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1 leading-tight">
                        {/* Title and clock share a row: the timestamp on
                                its own line pushed every row taller and read
                                as more important than the message. */}
                        <div className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-cream-900">
                            {n.title}
                          </span>
                          <span
                            className="flex-none font-mono text-[10.5px] text-cream-400"
                            title={fmtAgo(n.createdAt)}
                          >
                            {fmtClock(n.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[12.5px] leading-snug text-cream-500">
                          {n.body}
                        </div>
                      </div>
                      {/* Unread marker. `read` was already on every row and
                              had never been surfaced. */}
                      {!n.read && (
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
                      )}
                    </div>
                  );
                })}
              </section>
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100 text-cream-400">
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div className="text-sm text-cream-500">
                All quiet for now.
                <br />
                We'll buzz you the moment your wash is done.
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
