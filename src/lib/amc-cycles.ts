/** AMC “cycle” = chronological contract period on one projector: earliest start = cycle 1, next = cycle 2, … */

export type WithAmcCycle<T extends { startDate: string }> = T & {
  cycleNumber: number;
};

export function sortAmcByStartAsc<T extends { startDate: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function withAmcCycleNumbers<T extends { startDate: string }>(
  rows: T[],
): WithAmcCycle<T>[] {
  return sortAmcByStartAsc(rows).map((row, i) => ({
    ...row,
    cycleNumber: i + 1,
  }));
}
