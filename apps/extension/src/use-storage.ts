import { useEffect, useState } from 'react';

interface WatchableItem<T> {
  getValue(): Promise<T>;
  watch(cb: (value: T) => void): () => void;
}

/** Live value of a storage item; `undefined` until the first read resolves. */
export function useStorageItem<T>(item: WatchableItem<T>): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    void item.getValue().then(setValue);
    return item.watch(setValue);
  }, [item]);
  return value;
}
