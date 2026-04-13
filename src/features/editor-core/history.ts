export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createHistoryState<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: structuredClone(initial),
    future: []
  };
}

export function commitHistory<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  return {
    past: [...history.past, structuredClone(history.present)],
    present: structuredClone(next),
    future: []
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const previous = history.past.at(-1);
  if (!previous) {
    return history;
  }

  return {
    past: history.past.slice(0, -1),
    present: structuredClone(previous),
    future: [structuredClone(history.present), ...history.future]
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  const [next, ...rest] = history.future;
  if (!next) {
    return history;
  }

  return {
    past: [...history.past, structuredClone(history.present)],
    present: structuredClone(next),
    future: rest.map((entry) => structuredClone(entry))
  };
}
