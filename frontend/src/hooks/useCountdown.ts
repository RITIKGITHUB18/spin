import { useEffect, useState } from 'react';

/** A locally-ticking clock (1s) so countdowns feel live between the ~7s server polls. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
