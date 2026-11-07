import { useEffect, useState } from 'react';

interface LiveClockProps {
  timeZone: string;
}

const format = (timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date());

/** Local time for the configured time zone, refreshed every 15 seconds. */
export default function LiveClock({ timeZone }: LiveClockProps) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(format(timeZone));
    const id = window.setInterval(() => setTime(format(timeZone)), 15_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  // React re-renders this text: excluded from the page-breaking effect.
  return <time suppressHydrationWarning data-unbreakable>{time ?? '--:--'}</time>;
}
