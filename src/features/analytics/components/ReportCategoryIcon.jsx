import { useId } from 'react';

// A shared set of small illustrations keeps each report category recognisable.
export const REPORT_CATEGORY_PALETTES = {
  audience: ['#8c64cb', '#d9c4f5', '#f4edfc'],
  products: ['#4e7dc2', '#b4d6fa', '#eef5ff'],
  services: ['#b16f9e', '#efc4e1', '#fcf0f8'],
  checkout: ['#548e7e', '#b0e4d3', '#eef9f4'],
  revenue: ['#508776', '#abe0c4', '#eff9f2'],
  profit: ['#698c54', '#d3e6ae', '#f3f9eb'],
  payments: ['#b38b4d', '#f0d69b', '#fff8e9'],
  averages: ['#6284b4', '#c2d8f3', '#f0f5fc'],
  conversion: ['#9670b6', '#d8c3f0', '#f7f0fc'],
  discovery: ['#8370c2', '#d6ccf7', '#f4f1fd'],
  places: ['#5a98a1', '#b8e5e9', '#eff9fa'],
  buy: ['#5c8bbb', '#b8daf6', '#eff7fd'],
  book: ['#a7799e', '#e9c8df', '#fcf1f8'],
  inventory: ['#6284b4', '#c2d8f3', '#f0f5fc'],
  'stock-healthy': ['#508776', '#abe0c4', '#eff9f2'],
  'stock-low': ['#b38b4d', '#f0d69b', '#fff8e9'],
  'stock-out': ['#b96d82', '#f0bfd0', '#fdf0f5'],
};

function CategoryArtwork({ category, fill }) {
  const bag = <><path d="M8 12h16l1.5 16h-19Z" fill={fill} /><path d="M12 13V9a4 4 0 0 1 8 0v4" fill="none" /><path d="M12 21h8" stroke="#fff" /></>;
  const calendar = <><rect x="6" y="8" width="20" height="20" rx="4" fill={fill} /><path d="M6 14h20M11 5v6M21 5v6" fill="none" /><path d="m12 21 3 3 6-6" stroke="#fff" fill="none" /></>;
  const search = <g><circle cx="23" cy="23" r="5" fill="#fff" /><path d="m27 27 3 3" fill="none" /></g>;
  const box = <><path d="m4 10 11-5 11 5-11 5Z" fill={fill} /><path d="M4 10v12l11 5V15ZM15 15v12l11-5V10Z" fill={fill} /><path d="m9 8 11 5v5M8 19l3 1.5" fill="none" /></>;
  switch (category) {
    case 'inventory': return <><path d="M3 5v24M29 5v24M3 17h26M3 27h26" fill="none" /><rect x="6" y="7" width="8" height="10" rx="1.5" fill={fill} /><rect x="18" y="9" width="8" height="8" rx="1.5" fill={fill} /><rect x="8" y="20" width="16" height="7" rx="1.5" fill={fill} /><path d="M10 7v4M22 9v3M16 20v3" stroke="#fff" /></>;
    case 'stock-healthy': return <>{box}<circle cx="25" cy="24" r="6" fill="#fff" /><path d="m22 24 2 2 4-4" fill="none" /></>;
    case 'stock-low': return <>{box}<path d="m24 18 7 12H17Z" fill="#fff" /><path d="M24 22v3" fill="none" /><circle cx="24" cy="27" r=".8" fill="currentColor" stroke="none" /></>;
    case 'stock-out': return <><path d="m4 11 11-5 11 5-11 5Z" fill="#fff" /><path d="M4 11v11l11 5V16ZM15 16v11l11-5V11Z" fill={fill} /><path d="m4 11-2 4 11 5 2-4 2 4 11-5-2-4" fill={fill} /><circle cx="25" cy="25" r="6" fill="#fff" /><path d="m23 23 4 4m0-4-4 4" fill="none" /></>;
    case 'audience': return <><circle cx="23" cy="11" r="4" fill={fill} /><path d="M19 20a6 6 0 0 1 11 4v2h-9" fill={fill} /><circle cx="12" cy="10" r="5" fill={fill} /><path d="M3 26v-2a9 9 0 0 1 18 0v2Z" fill={fill} /><path d="M8 24h8" stroke="#fff" /></>;
    case 'products': return bag;
    case 'buy': return <>{bag}{search}</>;
    case 'services': return calendar;
    case 'book': return <>{calendar}{search}</>;
    case 'checkout': return <><path d="M3 6h4l3 16h16l3-11H8" fill={fill} /><path d="M13 15h10M15 18h6" stroke="#fff" /><circle cx="12" cy="27" r="2" fill="currentColor" /><circle cx="25" cy="27" r="2" fill="currentColor" /></>;
    case 'revenue': return <><rect x="3" y="11" width="24" height="16" rx="4" fill={fill} /><path d="M7 7h20a3 3 0 0 1 3 3v10" fill="none" /><circle cx="15" cy="19" r="4" fill="#fff" /><path d="M7 19h1M22 19h1" /></>;
    case 'profit': return <><rect x="5" y="19" width="5" height="9" rx="1.5" fill={fill} /><rect x="14" y="14" width="5" height="14" rx="1.5" fill={fill} /><rect x="23" y="9" width="5" height="19" rx="1.5" fill={fill} /><path d="m5 13 8-7 5 3 8-6M22 3h4v4" fill="none" /></>;
    case 'payments': return <><rect x="4" y="9" width="24" height="19" rx="4" fill={fill} /><path d="M6 9V6a2 2 0 0 1 2-2h15v5" fill="none" /><rect x="20" y="15" width="10" height="8" rx="2" fill="#fff" /><circle cx="24" cy="19" r="1" fill="currentColor" stroke="none" /></>;
    case 'averages': return <><rect x="7" y="4" width="18" height="25" rx="4" fill={fill} /><rect x="11" y="8" width="10" height="5" rx="1" fill="#fff" stroke="none" /><path d="M11 18h1m7 0h1m-9 6h1m7 0h1" stroke="#fff" strokeWidth="3" /></>;
    case 'conversion': return <><circle cx="15" cy="17" r="12" fill={fill} /><circle cx="15" cy="17" r="7" fill="#fff" /><circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" /><path d="m15 17 12-12m-4 0h4v4" fill="none" /></>;
    case 'places': return <><ellipse cx="16" cy="28" rx="8" ry="2" fill={fill} stroke="none" /><path d="M26 13c0 7-10 14-10 14S6 20 6 13a10 10 0 0 1 20 0Z" fill={fill} /><circle cx="16" cy="13" r="4" fill="#fff" /></>;
    default: return <><circle cx="16" cy="16" r="12" fill={fill} /><path d="m21 10-3 9-8 3 3-9Z" fill="#fff" /><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" /><path d="M16 4v2m10 10h2M16 26v2M4 16h2" stroke="#fff" /></>;
  }
}

export function ReportCategoryIcon({ category }) {
  const id = `report-art-${useId().replace(/:/g, '')}`;
  const [ink, colour, wash] = REPORT_CATEGORY_PALETTES[category] || REPORT_CATEGORY_PALETTES.discovery;
  return <span className="bb-report-category-icon" aria-hidden="true" style={{ '--report-icon-ink': ink, '--report-icon-wash': wash }}>
    <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" /><stop offset="1" stopColor={colour} /></linearGradient></defs>
      <CategoryArtwork category={category} fill={`url(#${id})`} />
    </svg>
  </span>;
}
