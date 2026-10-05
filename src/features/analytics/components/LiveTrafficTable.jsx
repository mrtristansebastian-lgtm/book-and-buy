import { useId } from 'react';
import { Globe2, Monitor, Smartphone, Tablet, CircleHelp } from 'lucide-react';
import { CountryFlag } from './CountryFlag';
import '../styles/live-traffic.css';

const DEVICE_TYPES = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'unknown', label: 'Device unavailable', Icon: CircleHelp }
];
const shareLabel = value => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

function DeviceMix({ devices = {} }) {
  return <div className="bb-live-traffic-devices">{DEVICE_TYPES.filter(device => devices[device.id] > 0).map(({ id: device, label, Icon }) =>
    <span key={device} aria-label={`${label}: ${devices[device]}`} title={`${label}: ${devices[device]}`}>
      <Icon size={14} strokeWidth={1.8} aria-hidden="true" /><span>{devices[device]}</span><span className="bb-control-sr-only"> {label}</span>
    </span>)}</div>;
}

export function LiveTrafficTable({ report = { rows: [], total: 0 }, title = 'Active visitors',
  variant = 'panel', level = report.level || 'country', hasMap = false, totalLabel }) {
  const id = `bb-live-traffic-${useId().replace(/:/g, '')}`;
  const { rows = [], total = 0, devices = {} } = report;
  const locationHeading = level === 'region' ? 'Region' : 'Country';
  return <section className={`bb-live-traffic bb-live-traffic--${variant}`} aria-labelledby={id}>
    <header className="bb-live-region-head bb-live-traffic-head">
      <div><p className="bb-live-world-eyebrow">Right now · Past 5 min</p><h2 id={id}>{title}</h2>
        <p className="bb-live-traffic-lede">{level === 'region' ? 'Where visitors are browsing in this country.' : 'Where your visitors are browsing and the devices they use.'}</p>
      </div>
      <span className="bb-live-region-total"><i aria-hidden="true" /><strong>{totalLabel || total.toLocaleString()}</strong><span>{total === 1 ? 'visitor' : 'visitors'}</span></span>
    </header>
    {rows.length ? <div className="bb-live-traffic-scroll" role="region" aria-label={`${title} table`} tabIndex={0}>
      <table className="bb-live-traffic-table">
        <caption className="bb-control-sr-only">{title} grouped by {locationHeading.toLowerCase()}, with visitor totals, share of traffic and device types.</caption>
        <thead><tr><th scope="col">{locationHeading}</th><th scope="col">Visitors</th><th scope="col">Share</th><th scope="col">Devices</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}>
          <th scope="row"><div className="bb-live-traffic-location"><CountryFlag country={row.countryCode} label={row.country} />
            <div><strong>{row.name}</strong><span className="bb-live-traffic-places">{row.cities.length
              ? row.cities.slice(0, 2).map(city => `${city.name} (${city.count})`).join(' · ') + (row.cities.length > 2 ? ` · +${row.cities.length - 2} more` : '')
              : level === 'country' && row.regions.length ? row.regions.slice(0, 2).map(region => region.name).join(' · ') : 'City unavailable'}</span>
              {hasMap && !row.mapped ? <span className="bb-live-traffic-unmatched">Not matched to the map</span> : null}
              <span className="bb-live-region-track" aria-hidden="true"><span style={{ width: `${row.share}%` }} /></span>
            </div></div></th>
          <td className="bb-live-traffic-count">{row.count.toLocaleString()}</td><td className="bb-live-traffic-share">{shareLabel(row.share)}</td>
          <td><DeviceMix devices={row.devices} /></td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Total</th><td>{total.toLocaleString()}</td><td>100%</td><td><DeviceMix devices={devices} /></td></tr></tfoot>
      </table>
    </div> : <div className="bb-live-region-empty"><Globe2 size={18} aria-hidden="true" /><div><strong>No visitors right now</strong><p>New activity appears here automatically.</p></div></div>}
    {rows.length ? <div className="bb-live-traffic-device-legend" aria-label="Device icon key">{DEVICE_TYPES.filter(device => devices[device.id] > 0).map(({ id: device, label, Icon }) =>
      <span key={device}><Icon size={12} strokeWidth={1.8} aria-hidden="true" />{label}</span>)}</div> : null}
    <p className="bb-live-traffic-note">Locations are approximate. Each tracked visitor counts once; visitors without location details stay in these totals.</p>
  </section>;
}
