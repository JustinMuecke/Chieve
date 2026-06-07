import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useProfileStats, type StatsTimelineEntry } from '../../api/profileStats';
import style from './profileStats.module.scss';

// ── Highlights ────────────────────────────────────────────────────────────────

interface Highlights {
  currentStreak: number;
  longestStreak: number;
  bestDay: { date: string; count: number } | null;
  activeDays: number;
}

function computeHighlights(timeline: StatsTimelineEntry[]): Highlights {
  if (timeline.length === 0) {
    return { currentStreak: 0, longestStreak: 0, bestDay: null, activeDays: 0 };
  }

  const activeDates = new Set(timeline.map(e => e.date.slice(0, 10)));

  const best = timeline.reduce((a, b) => b.daily_achievements > a.daily_achievements ? b : a);

  // Walk back from today; if today has no activity yet, start from yesterday
  const anchor = new Date();
  anchor.setHours(0, 0, 0, 0);
  if (!activeDates.has(localDateStr(anchor))) anchor.setDate(anchor.getDate() - 1);
  let currentStreak = 0;
  const cur = new Date(anchor);
  while (activeDates.has(localDateStr(cur))) {
    currentStreak++;
    cur.setDate(cur.getDate() - 1);
  }

  // Longest streak across all dates in timeline
  const sorted = [...timeline]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => e.date.slice(0, 10));
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [y1, m1, d1] = sorted[i - 1].split('-').map(Number);
    const [y2, m2, d2] = sorted[i].split('-').map(Number);
    const diff = Math.round(
      (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000
    );
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return { currentStreak, longestStreak: longest, bestDay: { date: best.date.slice(0, 10), count: best.daily_achievements }, activeDays: timeline.length };
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function HighlightRow({ timeline }: { timeline: StatsTimelineEntry[] }) {
  const h = computeHighlights(timeline);
  return (
    <div className={style.highlightGrid}>
      <div className={style.highlightItem}>
        <span className={style.highlightValue}>{h.currentStreak}</span>
        <span className={style.highlightLabel}>day streak</span>
      </div>
      <div className={style.highlightItem}>
        <span className={style.highlightValue}>{h.longestStreak}</span>
        <span className={style.highlightLabel}>longest streak</span>
      </div>
      <div className={style.highlightItem}>
        <span className={style.highlightValue}>
          {h.bestDay ? h.bestDay.count : 0}
        </span>
        <span className={style.highlightLabel}>
          best day{h.bestDay ? ` · ${fmtDate(h.bestDay.date)}` : ''}
        </span>
      </div>
      <div className={style.highlightItem}>
        <span className={style.highlightValue}>{h.activeDays}</span>
        <span className={style.highlightLabel}>active days</span>
      </div>
    </div>
  );
}

// ── Activity grid ─────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(timeline: StatsTimelineEntry[]) {
  const byDate: Record<string, number> = {};
  for (const e of timeline) byDate[e.date.slice(0, 10)] = e.daily_achievements;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // End on the nearest upcoming Saturday (or today if already Saturday)
  const end = new Date(today);
  end.setDate(end.getDate() + ((6 - end.getDay() + 7) % 7));

  // Go back exactly 52 weeks (363 days before end = 364 days total, always a Sunday)
  const start = new Date(end);
  start.setDate(start.getDate() - 363);

  const days: { date: string; count: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const key = localDateStr(cur);
    days.push({ date: key, count: byDate[key] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return days; // exactly 364 days = 52 full weeks
}

function intensityClass(count: number) {
  if (count === 0) return style.cell0;
  if (count <= 2) return style.cell1;
  if (count <= 5) return style.cell2;
  if (count <= 10) return style.cell3;
  return style.cell4;
}

function ActivityGrid({ timeline }: { timeline: StatsTimelineEntry[] }) {
  const days = buildGrid(timeline);

  // Group into weeks (columns)
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Month labels: find the first day of each month in the grid
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, col) => {
    week.forEach(day => {
      if (day.date.slice(8) === '01') {
        const monthIdx = parseInt(day.date.slice(5, 7)) - 1;
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        monthLabels.push({ label: monthNames[monthIdx], col });
      }
    });
  });

  return (
    <div className={style.gridWrap}>
      <div className={style.monthRow} style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)`, gap: '3px' }}>
        {monthLabels.map(m => (
          <span
            key={m.col}
            className={style.monthLabel}
            style={{ gridColumn: m.col + 1 }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <div className={style.grid} style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}>
        {weeks.map((week, wi) =>
          week.map((day, di) => (
            <div
              key={day.date}
              className={`${style.cell} ${intensityClass(day.count)}`}
              style={{ gridColumn: wi + 1, gridRow: di + 1 }}
              title={day.count > 0 ? `${day.date}: ${day.count} achievements` : day.date}
            />
          ))
        )}
      </div>
      <div className={style.legend}>
        <span>Less</span>
        {[style.cell0, style.cell1, style.cell2, style.cell3, style.cell4].map((c, i) => (
          <div key={i} className={`${style.cell} ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Combo chart ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('default', { month: 'short', day: 'numeric' });
}

function PointsChart({ timeline }: { timeline: StatsTimelineEntry[] }) {
  if (timeline.length === 0) {
    return <p className={style.empty}>No data yet.</p>;
  }

  // Thin out to ~60 data points max so the chart stays readable
  const step = Math.max(1, Math.floor(timeline.length / 60));
  const data = timeline.filter((_, i) => i % step === 0 || i === timeline.length - 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="cum"
          orientation="left"
          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <YAxis
          yAxisId="daily"
          orientation="right"
          tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(18,10,30,0.95)',
            border: '1px solid rgba(199,125,255,0.25)',
            borderRadius: 8,
            color: 'white',
            fontSize: 12,
          }}
          labelFormatter={formatDate}
          formatter={(value: number, name: string) => [
            value.toLocaleString(),
            name === 'cumulative_points' ? 'Total points' : 'Points today',
          ]}
        />
        <Bar
          yAxisId="daily"
          dataKey="daily_points"
          fill="rgba(199,125,255,0.25)"
          radius={[2, 2, 0, 0]}
          maxBarSize={12}
        />
        <Line
          yAxisId="cum"
          type="monotone"
          dataKey="cumulative_points"
          stroke="#c77dff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#c77dff' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ProfileStats({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useProfileStats(userId);

  if (isLoading) return <p className={style.empty}>Loading stats…</p>;
  if (isError || !data) return <p className={style.empty}>Could not load stats.</p>;

  const timeline = data.timeline;

  return (
    <div className={style.wrap}>
      <HighlightRow timeline={timeline} />

      <section className={style.section}>
        <h3 className={style.sectionTitle}>Activity</h3>
        <ActivityGrid timeline={timeline} />
      </section>

      <section className={style.section}>
        <h3 className={style.sectionTitle}>Points over time</h3>
        <PointsChart timeline={timeline} />
      </section>
    </div>
  );
}
