import { Search, X } from 'lucide-react';

export function CatalogToolbar({ query, onQueryChange, status, onStatusChange, count, total, noun }) {
  return <div className="bb-catalog-toolbar">
    <div className="bb-management-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label={`Search ${noun}`} placeholder={`Search ${noun} or categories…`} value={query} onChange={(event) => onQueryChange(event.target.value)} />{query ? <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')}><X size={16} /></button> : null}</div>
    <label><span className="sr-only">Catalog status</span><select value={status} onChange={(event) => onStatusChange(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="hidden">Hidden / draft</option></select></label>
    <span className="bb-catalog-results" aria-live="polite">{count} of {total} {noun}</span>
  </div>;
}
