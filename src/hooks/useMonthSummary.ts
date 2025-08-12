import { useEffect, useState } from 'react';
import { parseJsonl, groupByDate } from '../utils/parseJsonl';
import type { MoodDaySummary } from '../utils/parseJsonl';

const BASE_PATH = import.meta.env.VITE_BASE_PATH || '';
const MOOD_HISTORY_PATH = `${BASE_PATH}/data/history/`;

export function useMonthSummary(selectedMonth: string, includeAdjacent: boolean, months: string[]) {
  const [summary, setSummary] = useState<MoodDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMonth) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (includeAdjacent) {
          const [year, month] = selectedMonth.split('-').map(Number);
          const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
          const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
          const prevMonthExists = months.includes(prevMonth);
          const nextMonthExists = months.includes(nextMonth);
          const fetches = [
            prevMonthExists ? fetch(`${MOOD_HISTORY_PATH}${prevMonth}.jsonl`).then(r => r.ok ? r.text() : '') : Promise.resolve(''),
            fetch(`${MOOD_HISTORY_PATH}${selectedMonth}.jsonl`).then(r => r.ok ? r.text() : ''),
            nextMonthExists ? fetch(`${MOOD_HISTORY_PATH}${nextMonth}.jsonl`).then(r => r.ok ? r.text() : '') : Promise.resolve(''),
          ];
          const [prevText, currText, nextText] = await Promise.all(fetches);
          const prev = parseJsonl(prevText);
          const curr = parseJsonl(currText);
          const next = parseJsonl(nextText);
          const result = [...curr];
          let prevIdx = prev.length - 1;
          let nextIdx = 0;
          let turn = 0; // 0: prev, 1: next
          while (result.length < 30 && (prevIdx >= 0 || nextIdx < next.length)) {
            if (turn % 2 === 0 && prevIdx >= 0) {
              result.unshift(prev[prevIdx]);
              prevIdx--;
            } else if (turn % 2 === 1 && nextIdx < next.length) {
              result.push(next[nextIdx]);
              nextIdx++;
            } else if (prevIdx >= 0) {
              result.unshift(prev[prevIdx]);
              prevIdx--;
            } else if (nextIdx < next.length) {
              result.push(next[nextIdx]);
              nextIdx++;
            }
            turn++;
          }
          setSummary(groupByDate(result));
        } else {
          // 通常: 当月のみ
          const res = await fetch(`${MOOD_HISTORY_PATH}${selectedMonth}.jsonl`);
          if (!res.ok) throw new Error('データがありません');
          const text = await res.text();
          setSummary(groupByDate(parseJsonl(text)));
        }
      } catch {
        setError('データ取得エラー');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedMonth, includeAdjacent, months]);

  return { summary, loading, error };
}

