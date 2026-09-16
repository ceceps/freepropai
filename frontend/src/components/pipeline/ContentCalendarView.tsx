import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import { formatDate } from '../../utils/format';
import { isVideoPlatform } from './ContentCalendarDetailDrawer';
import type { PipelineCalendarItem } from '../../types';

export type CalendarViewMode = 'month' | 'week' | 'day';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PLATFORM_CHIP: Record<string, string> = {
  instagram_feed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  instagram_carousel: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300',
  instagram_story: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  tiktok: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  youtube_shorts: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
};

const chipClass = (platform: string) =>
  PLATFORM_CHIP[platform] || 'border-border bg-grey-50 text-text-secondary dark:bg-grey-800/40';

const toKey = (value: string) => value.slice(0, 10);
const todayKey = () => toKey(new Date().toISOString());

/** Monday-first week start for a given date */
const weekStart = (date: Date): Date => {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** Monday-first grid start for a month */
const monthGridStart = (month: Date): Date => {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return start;
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const labelDate = (d: Date) =>
  d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

interface ContentCalendarViewProps {
  month: Date;
  items: PipelineCalendarItem[];
  loading: boolean;
  onMonthChange: (month: Date) => void;
  onSelectItem: (id: string) => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

// ─── Chip ────────────────────────────────────────────────────────────────────

function ItemChip({
  item,
  onClick,
  compact = false,
}: {
  item: PipelineCalendarItem;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={item.hook || ''}
      className={`w-full text-left leading-tight px-1.5 py-1 rounded border truncate ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${chipClass(item.platform)}`}
    >
      <span className="inline-flex items-center gap-1 truncate">
        {isVideoPlatform(item.platform) && <Video className="w-2.5 h-2.5 flex-shrink-0" />}
        <span className="truncate">{item.hook || item.contentType}</span>
      </span>
    </button>
  );
}

// ─── Navigation header ────────────────────────────────────────────────────────

function NavHeader({
  label,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode: CalendarViewMode;
  onViewModeChange: (m: CalendarViewMode) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
      <div className="flex items-center gap-1">
        <button onClick={onPrev} className="btn btn-ghost btn-icon" aria-label="Previous">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-text-primary min-w-[150px] text-center">{label}</h3>
        <button onClick={onNext} className="btn btn-ghost btn-icon" aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={onToday} className="btn btn-ghost btn-sm ml-1">
          Today
        </button>
      </div>

      <div className="inline-flex rounded-md border border-border bg-grey-50 dark:bg-grey-900/40 p-0.5 text-xs">
        {(['day', 'week', 'month'] as CalendarViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onViewModeChange(m)}
            className={`px-3 py-1 rounded capitalize transition-colors ${
              viewMode === m
                ? 'bg-surface text-text-primary font-medium shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  month,
  grouped,
  loading,
  onSelectItem,
}: {
  month: Date;
  grouped: Map<string, PipelineCalendarItem[]>;
  loading: boolean;
  onSelectItem: (id: string) => void;
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const today = todayKey();

  const days = useMemo(() => {
    const start = monthGridStart(month);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const openDayItems = openDay ? grouped.get(openDay) ?? [] : [];

  return (
    <>
      <div className={`grid grid-cols-7 border-b border-border bg-grey-50 dark:bg-grey-900/40`}>
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-text-tertiary text-center">
            {d}
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 overflow-y-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ maxHeight: 620 }}
      >
        {days.map((day) => {
          const key = toKey(day.toISOString());
          const dayItems = grouped.get(key) ?? [];
          const inMonth = day.getMonth() === month.getMonth();
          const isToday = key === today;
          const CHIPS = 3;

          return (
            <div
              key={key}
              className={`min-h-[104px] border-b border-r border-border p-1.5 space-y-1 ${
                inMonth ? '' : 'bg-grey-50/60 dark:bg-grey-900/20'
              }`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? 'bg-primary-600 text-white rounded-full w-5 h-5 flex items-center justify-center'
                      : inMonth
                      ? 'text-text-secondary'
                      : 'text-text-tertiary'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] text-text-tertiary">{dayItems.length}</span>
                )}
              </div>

              {dayItems.slice(0, CHIPS).map((item) => (
                <ItemChip key={item.id} item={item} onClick={() => onSelectItem(item.id)} compact />
              ))}

              {dayItems.length > CHIPS && (
                <button
                  onClick={() => setOpenDay(key)}
                  className="w-full text-left text-[11px] px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400 hover:underline"
                >
                  +{dayItems.length - CHIPS} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Day overflow drawer */}
      {openDay && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="w-full max-w-md h-full bg-surface overflow-y-auto shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-text-primary">{formatDate(openDay)}</h3>
                <p className="text-xs text-text-tertiary">{openDayItems.length} scheduled items</p>
              </div>
              <button onClick={() => setOpenDay(null)} className="btn btn-ghost btn-icon" aria-label="Close">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {openDayItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setOpenDay(null);
                    onSelectItem(item.id);
                  }}
                  className={`w-full text-left p-3 rounded-lg border ${chipClass(item.platform)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium capitalize">
                      {item.platform.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] opacity-75 capitalize">
                      {item.contentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{item.hook || item.contentType}</p>
                  {item.listingTitle && (
                    <p className="text-xs opacity-75 mt-1 truncate">{item.listingTitle}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  anchor,
  grouped,
  loading,
  onSelectItem,
}: {
  anchor: Date;
  grouped: Map<string, PipelineCalendarItem[]>;
  loading: boolean;
  onSelectItem: (id: string) => void;
}) {
  const today = todayKey();
  const days = useMemo(() => {
    const start = weekStart(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  return (
    <div
      className={`overflow-y-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ maxHeight: 640 }}
    >
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border bg-grey-50 dark:bg-grey-900/40 sticky top-0 z-10">
        {days.map((day, i) => {
          const key = toKey(day.toISOString());
          const isToday = key === today;
          return (
            <div key={key} className="p-2 text-center border-r border-border last:border-r-0">
              <p className="text-[11px] text-text-tertiary">{WEEKDAYS_SHORT[i]}</p>
              <span
                className={`text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                  isToday
                    ? 'bg-primary-600 text-white'
                    : 'text-text-primary'
                }`}
              >
                {day.getDate()}
              </span>
              <p className="text-[10px] text-text-tertiary mt-0.5">{labelDate(day).split(' ')[1]}</p>
            </div>
          );
        })}
      </div>

      {/* Content rows */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const key = toKey(day.toISOString());
          const dayItems = grouped.get(key) ?? [];
          return (
            <div key={key} className="p-2 space-y-1.5 min-h-[200px]">
              {dayItems.length === 0 ? (
                <p className="text-[11px] text-text-tertiary text-center mt-4 opacity-50">—</p>
              ) : (
                dayItems.map((item) => (
                  <ItemChip key={item.id} item={item} onClick={() => onSelectItem(item.id)} compact />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────

function DayView({
  anchor,
  grouped,
  loading,
  onSelectItem,
}: {
  anchor: Date;
  grouped: Map<string, PipelineCalendarItem[]>;
  loading: boolean;
  onSelectItem: (id: string) => void;
}) {
  const key = toKey(anchor.toISOString());
  const dayItems = grouped.get(key) ?? [];
  const today = todayKey();
  const isToday = key === today;

  const label = anchor.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className={`overflow-y-auto ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ maxHeight: 640 }}
    >
      <div
        className={`px-4 py-3 border-b border-border text-sm font-semibold ${
          isToday ? 'text-primary-600' : 'text-text-primary'
        }`}
      >
        {label}
        {isToday && (
          <span className="ml-2 text-[11px] font-normal bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full">
            Today
          </span>
        )}
      </div>

      {dayItems.length === 0 ? (
        <div className="p-12 text-center text-text-tertiary">
          <p className="text-sm">No content scheduled for this day.</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {dayItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={`w-full text-left p-4 rounded-xl border transition-shadow hover:shadow-md ${chipClass(item.platform)}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {isVideoPlatform(item.platform) && <Video className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="text-xs font-medium capitalize">{item.platform.replace(/_/g, ' ')}</span>
                <span className="text-xs opacity-60 capitalize">{item.contentType.replace(/_/g, ' ')}</span>
                {item.approvalStatus && (
                  <span className="ml-auto text-[11px] opacity-75 capitalize">{item.approvalStatus}</span>
                )}
              </div>
              <p className="text-sm font-semibold leading-snug">{item.hook || item.contentType}</p>
              {item.captionDraft && (
                <p className="text-xs mt-1.5 opacity-75 line-clamp-2">{item.captionDraft}</p>
              )}
              {item.listingTitle && (
                <p className="text-[11px] mt-1.5 opacity-60 truncate">{item.listingTitle}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ContentCalendarView({
  month,
  items,
  loading,
  onMonthChange,
  onSelectItem,
  viewMode,
  onViewModeChange,
}: ContentCalendarViewProps) {
  // Week/day anchor is kept locally; month anchor is lifted to parent
  const [weekAnchor, setWeekAnchor] = useState(() => weekStart(new Date()));
  const [dayAnchor, setDayAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, PipelineCalendarItem[]>();
    for (const item of items) {
      if (!item.date) continue;
      const key = toKey(item.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [items]);

  // Navigation handlers per view
  const nav = {
    month: {
      label: month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      prev: () => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1)),
      next: () => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1)),
      today: () => onMonthChange(startOfMonth(new Date())),
    },
    week: {
      label: (() => {
        const end = addDays(weekAnchor, 6);
        return `${labelDate(weekAnchor)} – ${labelDate(end)} ${weekAnchor.getFullYear()}`;
      })(),
      prev: () => setWeekAnchor((d) => addDays(d, -7)),
      next: () => setWeekAnchor((d) => addDays(d, 7)),
      today: () => setWeekAnchor(weekStart(new Date())),
    },
    day: {
      label: dayAnchor.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      prev: () => setDayAnchor((d) => addDays(d, -1)),
      next: () => setDayAnchor((d) => addDays(d, 1)),
      today: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setDayAnchor(d);
      },
    },
  };

  const n = nav[viewMode];

  return (
    <div className="card p-0 overflow-hidden">
      <NavHeader
        label={n.label}
        onPrev={n.prev}
        onNext={n.next}
        onToday={n.today}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {viewMode === 'month' && (
        <MonthView
          month={month}
          grouped={grouped}
          loading={loading}
          onSelectItem={onSelectItem}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          anchor={weekAnchor}
          grouped={grouped}
          loading={loading}
          onSelectItem={onSelectItem}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          anchor={dayAnchor}
          grouped={grouped}
          loading={loading}
          onSelectItem={onSelectItem}
        />
      )}
    </div>
  );
}
