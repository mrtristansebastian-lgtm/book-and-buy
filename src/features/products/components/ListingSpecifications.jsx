import { listingSpecificationGroups, listingFacts, getListingType } from '../../../../functions/listingTypes.js';
import './listing-types.css';
export function ListingSpecifications({ product }) {
  const groups = listingSpecificationGroups(product);
  const facts = listingFacts(product);
  if (!groups.length) return null;
  const display = field => field.unit && Number.isFinite(Number(field.value)) ? Number(field.value).toLocaleString('en-ZA', { maximumFractionDigits: 3 }) : field.value;
  return <div className="bb-listing-details">
    {facts.length > 0 && <div className="bb-listing-key-facts">{facts.map((fact,index) => <span key={index}>{fact}</span>)}</div>}
    {groups.map((group,index) => <details className="bb-listing-spec-group" key={group.label} open={index === 0}>
      <summary>{group.label}</summary>
      <dl>{group.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field)}{field.unit ? ` ${field.unit}` : ''}</dd></div>)}</dl>
    </details>)}
    <p className="bb-listing-disclosure">{['physical', 'electronics'].includes(getListingType(product)) ? 'Specifications are supplied by the seller. Check the selected option for its exact details.' : 'Specifications and fitted equipment are supplied by the seller. Confirm the details of this particular listing with them.'}</p>
  </div>;
}
