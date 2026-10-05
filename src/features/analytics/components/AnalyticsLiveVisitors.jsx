import { useMemo } from 'react';
import { buildLiveTrafficRows } from '../utils/liveTrafficRows';
import { LiveTrafficTable } from './LiveTrafficTable';

// Keep existing settings-country-picker imports stable.
export { CountryFlag } from './CountryFlag';

export function AnalyticsLiveVisitors({ sessions = [], totalLabel }) {
  const report = useMemo(() => buildLiveTrafficRows(sessions), [sessions]);
  return <LiveTrafficTable report={report} title="Active visitors" totalLabel={totalLabel} />;
}
