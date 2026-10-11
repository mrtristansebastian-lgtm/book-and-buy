import { Button } from './Button';
import { BlankMedia } from './BlankMedia';
import { ArrowUpRight } from 'lucide-react';
import './business-catalog-row.css';

/** View and Edit are separate controls so editing never opens the detail page. */
export function BusinessCatalogCard({ name, image, price, priceLabel = 'Price', optionCount = 0, category, kind, summary, annotation, facts = [], onView, onEdit }) {
  const fromPrice = /^from\s/i.test(price || '');
  const visibleFacts = facts.filter(Boolean).slice(0, 3).map(fact => typeof fact === 'string' || typeof fact === 'number' ? { value: fact } : fact);
  return <article className="bb-business-catalog-row">
    <button type="button" className={`bb-business-row-view${visibleFacts.length ? ' has-facts' : ''}`} onClick={onView} aria-label={`View ${name}`}>
      <span className="bb-business-row-media">{image ? <img src={image} alt="" loading="lazy" /> : <BlankMedia variant="square" />}</span>
      <span className="bb-business-row-copy">
        <span className="bb-business-row-eyebrow"><span className="bb-business-row-kind">{kind}</span>{category && category.toLocaleLowerCase() !== name.toLocaleLowerCase() && <span className="bb-business-row-category">{category}</span>}</span>
        <span className="bb-business-row-title">{annotation && <span className={`bb-business-row-status${annotation === 'Active' ? ' is-active' : ''}`} role="img" aria-label={annotation} title={annotation}/>}<span className="bb-business-row-name">{name}</span></span>
        {visibleFacts.length > 0 && <span className="bb-business-row-facts">{visibleFacts.map((fact, index) => <span className="bb-business-row-fact" key={index}>{fact.label && <span className="bb-business-row-fact-label">{fact.label}: </span>}<span className="bb-business-row-fact-value">{fact.value}</span></span>)}</span>}
        {summary && <span className="bb-business-row-summary" title={summary}>{summary}</span>}
      </span>
      <span className="bb-business-row-price"><span className="bb-business-row-price-label">{optionCount > 0 ? `${optionCount} ${optionCount === 1 ? 'option' : 'options'}${/\d/.test(price || '') ? ' starting at' : ''}` : fromPrice ? 'Starting at' : priceLabel}</span><span className="bb-business-row-price-value">{fromPrice ? price.replace(/^from\s+/i, '') : price || '—'}</span></span>
      <span className="bb-business-row-open" aria-hidden="true"><ArrowUpRight size={17} strokeWidth={1.5}/></span>
    </button>
    {onEdit && <Button action="edit" variant="secondary" className="bb-business-row-edit" aria-label={`Edit ${name}`} onClick={onEdit}>Edit</Button>}
  </article>;
}
