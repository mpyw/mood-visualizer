import dayjs from 'dayjs';

export type MoodRecord = {
  date: string; // ISO 8601
  score: number;
  note?: string;
};

export type MoodDaySummary = {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  avg: number;
  notes: string[];
};

// JSONL文字列をMoodRecord[]に変換
export function parseJsonl(jsonl: string): MoodRecord[] {
  return jsonl
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line) as MoodRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is MoodRecord => !!r);
}

// 日付ごとにローソク足データへ集約
export function groupByDate(records: MoodRecord[]): MoodDaySummary[] {
  const grouped: Record<string, MoodRecord[]> = {};
  records.forEach(r => {
    const d = dayjs(r.date).format('YYYY-MM-DD');
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(r);
  });
  return Object.entries(grouped).map(([date, recs]) => {
    const scores = recs.map(r => r.score);
    return {
      date,
      open: recs[0].score,
      high: Math.max(...scores),
      low: Math.min(...scores),
      close: recs[recs.length - 1].score,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      notes: recs.map(r => r.note).filter(Boolean) as string[],
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

