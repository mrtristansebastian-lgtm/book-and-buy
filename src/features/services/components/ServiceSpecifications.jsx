import { serviceConfigurationFields, serviceFacts } from '../../../../functions/serviceTemplates.js';
import '../../products/components/listing-types.css';

/** The same approved service details are used in the office and public profile. */
export function ServiceSpecifications({ service }) {
  const fields = serviceConfigurationFields(service);
  const facts = serviceFacts(service);
  if (!fields.length) return null;
  return <div className="bb-listing-details">
    {facts.length > 0 && <div className="bb-listing-key-facts">{facts.map((fact, index) => <span key={index}>{fact}</span>)}</div>}
    <details className="bb-listing-spec-group" open>
      <summary>Service details</summary>
      <dl>{fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
    </details>
  </div>;
}
