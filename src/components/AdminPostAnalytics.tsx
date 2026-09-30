'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FileText, PenLine, type LucideIcon } from 'lucide-react';

type Period = 'week' | 'month' | 'upcoming';
type ChartDay = { date: string; count: number };
type ChartDatum = { label: string; count: number };
type TeamRole = 'ADMIN' | 'MANAGER' | 'CREATOR';

interface TeamMember {
  role: TeamRole;
}

interface AnalyticsData {
  summary: { totalPosts: number; drafts: number; pendingReview: number; scheduled: number };
  publishedDays: ChartDay[];
  scheduledDays: ChartDay[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekInput(date: Date) {
  const weekStart = startOfWeek(date);
  const thursday = addDays(weekStart, 3);
  const weekYear = thursday.getFullYear();
  const firstWeek = startOfWeek(new Date(weekYear, 0, 4));
  const weekNumber = Math.round((weekStart.getTime() - firstWeek.getTime()) / WEEK_MS) + 1;
  return `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;
}

function parseWeekInput(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const firstWeek = startOfWeek(new Date(Number(match[1]), 0, 4));
  return addDays(firstWeek, (Number(match[2]) - 1) * 7);
}

function formatMonthInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : null;
}

function getRange(period: Exclude<Period, 'upcoming'>, date: Date) {
  if (period === 'week') {
    const from = startOfWeek(date);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfMonth(date);
  return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) };
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function formatRangeLabel(from: Date, toExclusive: Date) {
  const lastDay = addDays(toExclusive, -1);
  return `${formatShortDate(from)} - ${formatShortDate(lastDay)}, ${lastDay.getFullYear()}`;
}

function countByDate(days: ChartDay[]) {
  return new Map(days.map(({ date, count }) => [date, count]));
}

function dailyChartData(days: ChartDay[], selectedDate: Date): ChartDatum[] {
  const counts = countByDate(days);
  const weekStart = startOfWeek(selectedDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date),
      count: counts.get(formatDateKey(date)) || 0,
    };
  });
}

function weeklyChartData(days: ChartDay[], selectedDate: Date): ChartDatum[] {
  const counts = countByDate(days);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const data: ChartDatum[] = [];

  for (let weekStart = startOfWeek(monthStart); weekStart < monthEnd; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 7);
    const visibleStart = weekStart < monthStart ? monthStart : weekStart;
    const visibleEnd = weekEnd > monthEnd ? monthEnd : weekEnd;
    let count = 0;
    for (let date = visibleStart; date < visibleEnd; date = addDays(date, 1)) {
      count += counts.get(formatDateKey(date)) || 0;
    }
    data.push({ label: `${formatShortDate(visibleStart)} - ${formatShortDate(addDays(visibleEnd, -1))}`, count });
  }

  return data;
}

function upcomingWeeklyData(days: ChartDay[]): ChartDatum[] {
  const counts = new Map<string, number>();
  for (const item of days) {
    const week = startOfWeek(dateFromKey(item.date));
    const key = formatDateKey(week);
    counts.set(key, (counts.get(key) || 0) + item.count);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([weekKey, count]) => {
      const from = dateFromKey(weekKey);
      return { label: `${formatShortDate(from)} - ${formatShortDate(addDays(from, 6))}`, count };
    });
}

function SegmentButton({ selected, children, onClick, label }: { selected: boolean; children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      style={{
        padding: '7px 10px',
        border: '0',
        borderBottom: selected ? '2px solid #8BD48A' : '2px solid transparent',
        background: selected ? 'rgba(48, 109, 41, 0.16)' : 'transparent',
        color: selected ? '#FBF5DD' : '#C9C19A',
        font: 'inherit',
        fontSize: '0.82rem',
        fontWeight: selected ? 700 : 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, color, Icon }: { label: string; value?: number; color: string; Icon: LucideIcon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
      <Icon aria-hidden="true" style={{ width: '28px', height: '28px', color, flexShrink: 0 }} />
      <div>
        <div style={{ color: '#C9C19A', fontSize: '0.85rem', fontWeight: 600 }}>{label}</div>
        <div style={{ color, fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.2 }}>{value?.toLocaleString() ?? '...'}</div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="loading-skeleton" role="status" aria-label="Loading chart data" style={{ height: '250px', marginTop: '20px' }} />;
}

function ChartSection({
  title,
  color,
  data,
  loading,
  error,
  emptyMessage,
  controls,
}: {
  title: string;
  color: string;
  data: ChartDatum[];
  loading: boolean;
  error: boolean;
  emptyMessage: string;
  controls: ReactNode;
}) {
  return (
    <section aria-label={title} style={{ padding: '18px 0', borderBottom: '1px solid rgba(231, 225, 177, 0.16)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#FBF5DD', fontSize: '1.15rem', fontWeight: 700 }}>{title}</h2>
        </div>
        {controls}
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <div role="status" style={{ display: 'grid', placeItems: 'center', height: '250px', color: '#C9C19A', fontSize: '0.9rem' }}>
          Chart data is unavailable.
        </div>
      ) : data.length === 0 || data.every((item) => item.count === 0) ? (
        <div role="status" style={{ display: 'grid', placeItems: 'center', height: '250px', color: '#C9C19A', fontSize: '0.9rem' }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto', marginTop: '12px' }}>
          <ResponsiveContainer width={data.length > 10 ? Math.max(680, data.length * 66) : '100%'} height={250}>
            <BarChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 4 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="rgba(231, 225, 177, 0.12)" />
              <XAxis dataKey="label" tick={{ fill: '#C9C19A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(231, 225, 177, 0.2)' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} width={34} tick={{ fill: '#C9C19A', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.045)' }}
                contentStyle={{ background: '#11170f', border: '1px solid rgba(231, 225, 177, 0.24)', borderRadius: '6px', color: '#FBF5DD' }}
                labelStyle={{ color: '#FBF5DD', fontWeight: 700 }}
                itemStyle={{ color }}
                formatter={(value) => [value ?? 0, 'Posts']}
              />
              <Bar dataKey="count" name="Posts" fill={color} radius={[4, 4, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function AdminPostAnalytics({ members }: { members: TeamMember[] }) {
  const [publishedPeriod, setPublishedPeriod] = useState<Exclude<Period, 'upcoming'>>('week');
  const [publishedDate, setPublishedDate] = useState(() => new Date());
  const [scheduledPeriod, setScheduledPeriod] = useState<Period>('week');
  const [scheduledDate, setScheduledDate] = useState(() => new Date());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [instagramConnected, setInstagramConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async (showLoading: boolean) => {
      if (showLoading) {
        setLoading(true);
        setError(null);
        setData(null);
      }

      const publishedRange = getRange(publishedPeriod, publishedDate);
      const scheduledRange = scheduledPeriod === 'upcoming' ? null : getRange(scheduledPeriod, scheduledDate);
      const params = new URLSearchParams({
        publishedFrom: publishedRange.from.toISOString(),
        publishedTo: publishedRange.to.toISOString(),
        scheduledFrom: scheduledRange?.from.toISOString() || new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      if (scheduledRange) params.set('scheduledTo', scheduledRange.to.toISOString());

      try {
        const response = await fetch(`/api/posts/analytics?${params.toString()}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load post analytics.');
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : 'Unable to load post analytics.');
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    void fetchAnalytics(true);
    const interval = window.setInterval(() => void fetchAnalytics(false), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [publishedPeriod, publishedDate, scheduledPeriod, scheduledDate, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchSocialStatuses = async () => {
      const readStatus = async (endpoint: string) => {
        try {
          const response = await fetch(endpoint, { cache: 'no-store' });
          if (!response.ok) return null;
          const result = await response.json();
          return typeof result.connected === 'boolean' ? result.connected : null;
        } catch {
          return null;
        }
      };

      const [linkedin, instagram] = await Promise.all([
        readStatus('/api/social/linkedin'),
        readStatus('/api/social/instagram'),
      ]);
      if (!cancelled) {
        setLinkedinConnected(linkedin);
        setInstagramConnected(instagram);
      }
    };

    void fetchSocialStatuses();
    const interval = window.setInterval(() => void fetchSocialStatuses(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const today = new Date();
  const currentWeek = startOfWeek(today);
  const currentMonth = startOfMonth(today);
  const publishedChartData = publishedPeriod === 'week'
    ? dailyChartData(data?.publishedDays || [], publishedDate)
    : weeklyChartData(data?.publishedDays || [], publishedDate);
  const scheduledChartData = scheduledPeriod === 'upcoming'
    ? upcomingWeeklyData(data?.scheduledDays || [])
    : scheduledPeriod === 'week'
      ? dailyChartData(data?.scheduledDays || [], scheduledDate)
      : weeklyChartData(data?.scheduledDays || [], scheduledDate);
  const changeDate = (period: Exclude<Period, 'upcoming'>, date: Date, delta: number, setDate: (date: Date) => void, isScheduled: boolean) => {
    const shifted = period === 'week'
      ? addDays(date, delta * 7)
      : new Date(date.getFullYear(), date.getMonth() + delta, 1);
    if (isScheduled) {
      const earliest = period === 'week' ? currentWeek : currentMonth;
      const candidate = period === 'week' ? startOfWeek(shifted) : startOfMonth(shifted);
      if (candidate < earliest) return;
    }
    setDate(shifted);
  };

  const dateControls = (
    period: Exclude<Period, 'upcoming'>,
    date: Date,
    setDate: (date: Date) => void,
    isScheduled: boolean,
    title: string
  ) => {
    const range = getRange(period, date);
    const earliest = period === 'week' ? currentWeek : currentMonth;
    const currentPeriodStart = period === 'week' ? startOfWeek(date) : startOfMonth(date);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', flex: '0 0 auto' }}>
        <button type="button" aria-label={`Previous ${title} ${period}`} title={`Previous ${period}`} disabled={isScheduled && currentPeriodStart <= earliest} onClick={() => changeDate(period, date, -1, setDate, isScheduled)} style={navButtonStyle(isScheduled && currentPeriodStart <= earliest)}>
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <input
          type={period}
          aria-label={`Select ${title} ${period}`}
          value={period === 'week' ? formatWeekInput(date) : formatMonthInput(date)}
          min={isScheduled ? period === 'week' ? formatWeekInput(today) : formatMonthInput(today) : undefined}
          onChange={(event) => {
            const selected = period === 'week' ? parseWeekInput(event.target.value) : parseMonthInput(event.target.value);
            if (selected) setDate(selected);
          }}
          style={{ ...inputStyle, width: period === 'week' ? '142px' : '154px' }}
        />
        <button type="button" aria-label={`Next ${title} ${period}`} title={`Next ${period}`} onClick={() => changeDate(period, date, 1, setDate, isScheduled)} style={navButtonStyle(false)}>
          <ChevronRight aria-hidden="true" size={17} />
        </button>
        <span style={{ whiteSpace: 'nowrap', color: '#C9C19A', fontSize: '0.75rem', flex: '0 0 auto' }}>
          {period === 'week'
            ? formatRangeLabel(range.from, range.to)
            : new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)}
        </span>
      </div>
    );
  };

  const publishedControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', maxWidth: '100%', overflowX: 'auto' }}>
      <div role="group" aria-label="Published posts chart period" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <SegmentButton selected={publishedPeriod === 'week'} label="Published posts by week" onClick={() => setPublishedPeriod('week')}>Week</SegmentButton>
        <SegmentButton selected={publishedPeriod === 'month'} label="Published posts by month" onClick={() => setPublishedPeriod('month')}>Month</SegmentButton>
      </div>
      {dateControls(publishedPeriod, publishedDate, setPublishedDate, false, 'published posts')}
    </div>
  );

  const scheduledControls = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', maxWidth: '100%', overflowX: 'auto' }}>
      <div role="group" aria-label="Scheduled posts chart period" style={{ display: 'inline-flex', flexShrink: 0 }}>
        <SegmentButton selected={scheduledPeriod === 'week'} label="Scheduled posts by week" onClick={() => setScheduledPeriod('week')}>Week</SegmentButton>
        <SegmentButton selected={scheduledPeriod === 'month'} label="Scheduled posts by month" onClick={() => setScheduledPeriod('month')}>Month</SegmentButton>
        <SegmentButton selected={scheduledPeriod === 'upcoming'} label="All upcoming scheduled posts" onClick={() => setScheduledPeriod('upcoming')}>Upcoming</SegmentButton>
      </div>
      {scheduledPeriod !== 'upcoming' && dateControls(scheduledPeriod, scheduledDate, setScheduledDate, true, 'scheduled posts')}
    </div>
  );

  return (
    <div>
      <div aria-label="Post overview metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px', padding: '16px 0', borderTop: '1px solid rgba(231, 225, 177, 0.16)', borderBottom: '1px solid rgba(231, 225, 177, 0.16)' }}>
        <Metric label="Total Posts" value={data?.summary.totalPosts} Icon={FileText} color="#8BD48A" />
        <Metric label="Drafts" value={data?.summary.drafts} Icon={PenLine} color="#78C8FF" />
        <Metric label="Pending Review" value={data?.summary.pendingReview} Icon={ClipboardCheck} color="#FFC66D" />
        <Metric label="Scheduled" value={data?.summary.scheduled} Icon={CalendarDays} color="#C5A6FF" />
      </div>

      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', color: '#fca5a5', borderBottom: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.86rem' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} style={{ ...navButtonStyle(false), color: '#FBF5DD', padding: '6px 10px', whiteSpace: 'nowrap' }}>Retry</button>
        </div>
      )}

      <div className="admin-analytics-charts">
        <ChartSection
          title="Published Posts"
          color="#8BD48A"
          data={publishedChartData}
          loading={loading}
          error={Boolean(error && !data)}
          emptyMessage={`No published posts for ${publishedPeriod === 'week' ? 'this week' : 'this month'}.`}
          controls={publishedControls}
        />

        <ChartSection
          title="Scheduled Posts"
          color="#FFC66D"
          data={scheduledChartData}
          loading={loading}
          error={Boolean(error && !data)}
          emptyMessage={scheduledPeriod === 'upcoming' ? 'No future posts are scheduled.' : `No posts scheduled for ${scheduledPeriod === 'week' ? 'this week' : 'this month'}.`}
          controls={scheduledControls}
        />
      </div>

      <div className="admin-overview-details">
        <section aria-labelledby="admin-team-overview-title" style={{ padding: '18px 0', borderBottom: '1px solid rgba(231, 225, 177, 0.16)' }}>
          <h2 id="admin-team-overview-title" style={{ margin: '0 0 14px', color: '#FBF5DD', fontSize: '1.05rem', fontWeight: 700 }}>Team Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Total', value: members.length, color: '#FBF5DD' },
              { label: 'Admins', value: members.filter((member) => member.role === 'ADMIN').length, color: '#8BD48A' },
              { label: 'Managers', value: members.filter((member) => member.role === 'MANAGER').length, color: '#78C8FF' },
              { label: 'Creators', value: members.filter((member) => member.role === 'CREATOR').length, color: '#FFC66D' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: '#C9C19A', fontSize: '0.78rem', fontWeight: 600 }}>{label}</span>
                <span style={{ color, fontSize: '1.3rem', fontWeight: 750 }}>{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="admin-social-accounts-title" style={{ padding: '18px 0', borderBottom: '1px solid rgba(231, 225, 177, 0.16)' }}>
          <h2 id="admin-social-accounts-title" style={{ margin: '0 0 14px', color: '#FBF5DD', fontSize: '1.05rem', fontWeight: 700 }}>Social Accounts</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '14px' }}>
            {[
              { name: 'LinkedIn', connected: linkedinConnected },
              { name: 'Instagram', connected: instagramConnected },
              { name: 'Facebook', connected: false },
            ].map(({ name, connected }) => {
              const status = connected === null ? 'Checking status' : connected ? 'Connected' : 'Disconnected';
              const dotColor = connected === null ? '#C9C19A' : connected ? '#8BD48A' : '#F87171';
              return (
                <div key={name} aria-label={`${name}: ${status}`} title={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FBF5DD', fontSize: '0.88rem', fontWeight: 600 }}>
                  <span aria-hidden="true" style={{ width: '9px', height: '9px', flex: '0 0 9px', borderRadius: '50%', background: dotColor, boxShadow: connected === null ? 'none' : `0 0 8px ${dotColor}66` }} />
                  {name}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  height: '34px',
  padding: '0 8px',
  border: '1px solid rgba(231, 225, 177, 0.24)',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.035)',
  color: '#FBF5DD',
  colorScheme: 'dark',
  font: 'inherit',
  fontSize: '0.8rem',
};

function navButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    padding: 0,
    border: '1px solid rgba(231, 225, 177, 0.24)',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.035)',
    color: disabled ? '#756F58' : '#FBF5DD',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}