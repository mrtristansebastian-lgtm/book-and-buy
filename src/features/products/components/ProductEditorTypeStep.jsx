import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, MessageCircle, Plus, Search, X, SlidersHorizontal } from 'lucide-react';
import { getListingType, getListingSchema, getApplicableListingSchema, listingDetailsKey, isEnquiryListing } from '../../../../functions/listingTypes.js';
import { getProductCategoryTemplate, getProductTemplate } from '../../../../functions/catalogTemplates.js';
import { CatalogTypePicker } from '../../../shared/ui/CatalogTypePicker';
import { SetupPicker } from '../../../shared/ui/SetupPicker';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import { listingLocationOptions } from '../../../../functions/listingLocation.js';
import './listing-types.css';

const basics = field => field.required || field.essential;
const hasValue = value => value != null && String(value).trim() !== '';

export function ProductEditorTypeStep({ draft, patch }) {
  const selected = getListingType(draft);
  const templates = category => [getProductCategoryTemplate(category)].filter(template => template && (!draft.id || template.listingType === selected));
  const choose = ({ mainCategoryId, subcategoryId, template }) => {
    const category = { exploreMainCategoryId: mainCategoryId, exploreSubcategoryId: subcategoryId, catalogTemplateId: template?.id || '' };
    if (!template) { patch(category); return; }
    const enquiry = ['vehicle', 'equipment'].includes(template.listingType);
    const key = listingDetailsKey({ listingType: template.listingType });
    const details = { ...(draft[key] || {}) };
    if (template.allowedDeviceTypes && !template.allowedDeviceTypes.includes(details.deviceType)) delete details.deviceType;
    patch({ ...category,
      listingType: template.listingType, transactionMode: enquiry ? 'enquiry' : 'checkout',
      [key]: { ...details, ...(template.detailDefaults || {}), ...(template.deviceType ? { deviceType: template.deviceType } : {}) },
      ...(enquiry ? { quoteBased: false, priceType: 'fixed', options: [], variants: [], compareAtPrice: '' } : {})
    });
  };
  return <section className="bb-services-section">
    <h3 className="bb-services-section-title">What are you listing?</h3>
    <p className="bb-services-section-lede">{draft.id ? 'Update the category within this listing’s existing product family.' : 'Choose a main category and subcategory. We’ll tailor the specifications from there.'}</p>
    <CatalogTypePicker mode="buy" mainCategoryId={draft.exploreMainCategoryId} subcategoryId={draft.exploreSubcategoryId} templateId={draft.catalogTemplateId} getTemplates={templates} onChange={choose}/>
    {draft.catalogTemplateId && isEnquiryListing(draft) && <p className="bb-listing-mode-note"><MessageCircle size={17}/>Customers can enquire or request a viewing. This listing stays out of the cart.</p>}
  </section>;
}

function SpecificationField({ field, value, onChange, onRemove }) {
  const id = useId();
  const label = `${field.label}${field.unit ? ` (${field.unit})` : ''}`;
  const choices = (field.options || []).map(option => typeof option === 'string' ? { value: option, label: option } : option);
  const hasUnspecified = choices.some(option => option.label.toLowerCase() === 'not specified');
  return <div className={`bb-services-field bb-spec-field${field.multiline ? ' bb-listing-field-wide' : ''}`}>
    <div className="bb-spec-field-label">
      <label htmlFor={field.options ? undefined : id}>{label}{field.required && <span className="bb-spec-required" aria-label="required"> *</span>}</label>
      {onRemove && <button type="button" className="bb-spec-remove" onClick={onRemove} aria-label={`Remove ${field.label.toLowerCase()} specification`} title={`Remove ${field.label}`}><X size={14}/></button>}
    </div>
    {field.options ? <SetupPicker
      label={label}
      value={value ?? ''}
      options={[...(!field.required && !hasUnspecified ? [{ value: '', label: 'Not specified' }] : []), ...choices]}
      placeholder={field.required ? `Choose ${field.label.toLowerCase()}` : 'Not specified'}
      onChange={onChange}
      searchable={field.options.length > 7}
    /> : field.multiline ? <textarea id={id} className="native-control-input" rows={3} maxLength={field.maxLength || 1600} value={value ?? ''} onChange={event => onChange(event.target.value)}/> : <input
      id={id}
      className="native-control-input"
      inputMode={field.type === 'number' ? field.integer ? 'numeric' : 'decimal' : undefined}
      maxLength={field.maxLength || 160}
      value={value ?? ''}
      onChange={event => onChange(event.target.value)}
    />}
    {field.hint && <small>{field.hint}</small>}
  </div>;
}

function AddSpecificationsDialog({ groups, selectedKeys, onAdd, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  useDialogFocus(dialogRef, true, onClose);
  const needle = query.trim().toLocaleLowerCase();
  const filtered = groups.filter(item => group === 'all' || item.label === group).map(item => ({
    ...item,
    fields: item.fields.filter(field => !basics(field) && (!needle || `${field.label} ${field.unit || ''} ${field.hint || ''} ${item.label}`.toLocaleLowerCase().includes(needle)))
  })).filter(item => item.fields.length);
  const optionGroups = groups.filter(item => item.fields.some(field => !basics(field)));
  const remaining = optionGroups.flatMap(item => item.fields).filter(field => !basics(field) && !selectedKeys.has(field.key)).length;
  return createPortal(<div className="native-ui bb-spec-dialog-backdrop" onClick={onClose}>
    <section ref={dialogRef} tabIndex={-1} className="bb-spec-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <header className="bb-spec-dialog-head">
        <div><span className="bb-spec-dialog-eyebrow"><SlidersHorizontal size={15}/> Build your specification</span><h3 id={titleId}>Add specifications</h3><p>Choose the details that matter to this listing.</p></div>
        <button type="button" className="bb-spec-dialog-close" onClick={onClose} aria-label="Close specifications menu"><X size={19}/></button>
      </header>
      <label className="bb-spec-search"><Search size={17}/><span className="sr-only">Search specifications</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search specifications…"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Clear specification search"><X size={15}/></button>}</label>
      <div className="bb-spec-categories" role="group" aria-label="Specification categories">
        <button type="button" className={group === 'all' ? 'is-selected' : ''} aria-pressed={group === 'all'} onClick={() => setGroup('all')}>All specifications</button>
        {optionGroups.map(item => <button type="button" key={item.label} className={group === item.label ? 'is-selected' : ''} aria-pressed={group === item.label} onClick={() => setGroup(item.label)}>{item.label}</button>)}
      </div>
      <div className="bb-spec-options">
        {filtered.map(item => <section className="bb-spec-option-group" key={item.label}><h4>{item.label}</h4><div>{item.fields.map(field => {
          const added = selectedKeys.has(field.key);
          return <button type="button" key={field.key} className={`bb-spec-option${added ? ' is-added' : ''}`} aria-disabled={added} onClick={() => { if (!added) onAdd(field.key); }}>
            <span><strong>{field.label}</strong>{field.hint && <small>{field.hint}</small>}</span>
            <span className="bb-spec-option-end">{field.unit && <small>{field.unit}</small>}{added ? <><span>Added</span><Check size={17}/></> : <Plus size={17}/>}</span>
          </button>;
        })}</div></section>)}
        {!filtered.length && <div className="bb-spec-empty"><Search size={23}/><strong>No specifications found</strong><p>Try another word or choose a different category.</p></div>}
      </div>
      <footer className="bb-spec-dialog-footer"><span aria-live="polite">{remaining ? `${remaining} optional fields available` : 'All available fields added'}</span><button type="button" onClick={onClose}>Done <Check size={15}/></button></footer>
    </section>
  </div>, document.body);
}

export function ProductEditorSpecificationsStep({ draft, patch, workspace = {} }) {
  const [addOpen, setAddOpen] = useState(false);
  const key = listingDetailsKey(draft);
  const details = draft[key] || {};
  const type = getListingType(draft);
  const template = getProductTemplate(draft.catalogTemplateId);
  const pinnedKeys = new Set([...Object.keys(template?.detailDefaults || {}), ...(template?.deviceType ? ['deviceType'] : [])]);
  const schema = getListingSchema(draft);
  const applicable = getApplicableListingSchema(draft).map(group => ({ ...group, fields: group.fields.filter(field => !field.templateFixed) })).filter(group => group.fields.length);
  const essentialFields = applicable.flatMap(group => group.fields).filter(basics);
  const essentialKeys = new Set(essentialFields.map(field => field.key));
  const applicableKeys = new Set(applicable.flatMap(group => group.fields).map(field => field.key));
  const allOptional = schema.flatMap(group => group.fields).filter(field => !field.required && !essentialKeys.has(field.key) && !pinnedKeys.has(field.key));
  const allowedKeys = new Set(allOptional.map(field => field.key));
  const savedOptionalKeys = new Set(schema.flatMap(group => group.fields).filter(field => !field.required).map(field => field.key));
  const savedSelection = (Array.isArray(draft.listingSpecFields) ? draft.listingSpecFields : []).filter(field => savedOptionalKeys.has(field) && !pinnedKeys.has(field));
  const selectedKeys = new Set([
    ...savedSelection.filter(field => allowedKeys.has(field)),
    ...allOptional.filter(field => hasValue(details[field.key])).map(field => field.key)
  ]);
  const selectedGroups = schema.map(group => ({ ...group, fields: group.fields.filter(field => !essentialKeys.has(field.key) && selectedKeys.has(field.key)) })).filter(group => group.fields.length);
  const preservedFields = [...selectedKeys].some(field => !applicableKeys.has(field));
  const availableCount = applicable.flatMap(group => group.fields).filter(field => !basics(field) && !selectedKeys.has(field.key)).length;
  const set = (field, value) => patch({ [key]: { ...details, [field]: value } });
  const add = field => patch({ listingSpecFields: [...new Set([...savedSelection, ...selectedKeys, field])] });
  const remove = field => {
    const nextDetails = { ...details };
    delete nextDetails[field];
    patch({ [key]: nextDetails, listingSpecFields: [...new Set([...savedSelection, ...selectedKeys])].filter(item => item !== field) });
  };
  const heading = template ? `${template.label} specifications` : type === 'vehicle' ? 'Vehicle specifications' : type === 'equipment' ? 'Equipment specifications' : type === 'electronics' ? 'Electronics specifications' : 'Product specifications';
  const locations = listingLocationOptions(workspace, details.location || '');
  return <section className="bb-services-section bb-spec-editor">
    <h3 className="bb-services-section-title">{heading}</h3>
    <p className="bb-services-section-lede">Start with the essentials. Add extra specifications when you need them.</p>
    {isEnquiryListing(draft) && <div className="bb-spec-availability"><span>Listing availability</span><SetupPicker label="Listing availability" value={draft.listingAvailability || 'available'} onChange={value => patch({ listingAvailability: value })} options={[
      { value: 'available', label: 'Available', description: 'Accept enquiries and viewing requests' },
      { value: 'reserved', label: 'Reserved', description: 'Pause new enquiries while it is reserved' },
      { value: 'sold', label: 'Sold', description: 'Keep the listing with its sold status' }
    ]}/></div>}
    <fieldset className="bb-listing-fieldset bb-spec-essentials"><legend><span>Essentials</span><small>The basics buyers look for</small></legend><div className="bb-listing-field-grid">{essentialFields.map(field => <SpecificationField key={field.key} field={field.key === 'location' ? { ...field, ...(locations.length ? { options: locations } : {}), hint: locations.length ? [details.location, 'Defaults to your business location. Choose a branch if this listing is based elsewhere.'].filter(Boolean).join(' — ') : 'Set your business location and branches in Settings → Locations, or enter this listing’s location here.' } : field} value={details[field.key]} onChange={value => set(field.key, value)}/>)}</div></fieldset>
    <div className="bb-spec-extras-heading"><div><h4>Additional specifications</h4><p>{selectedKeys.size ? `${selectedKeys.size} ${selectedKeys.size === 1 ? 'detail' : 'details'} added to this listing` : 'Make the listing yours, one detail at a time.'}</p></div><button type="button" className="bb-spec-add" onClick={() => setAddOpen(true)} disabled={!availableCount}><Plus size={17}/>Add specification</button></div>
    {preservedFields && <p className="bb-spec-preserved">Specifications from your previous selection are kept below. Remove any that no longer apply.</p>}
    {selectedGroups.length ? selectedGroups.map(group => <fieldset className="bb-listing-fieldset bb-spec-extra-group" key={group.label}><legend>{group.label}</legend><div className="bb-listing-field-grid">{group.fields.map(field => <SpecificationField key={field.key} field={field} value={details[field.key]} onChange={value => set(field.key, value)} onRemove={() => remove(field.key)}/>)}</div></fieldset>) : <div className="bb-spec-start"><span><SlidersHorizontal size={22}/></span><div><strong>Only show what matters.</strong><p>{type === 'electronics' ? 'Add storage, display, connectivity and other useful specs.' : type === 'vehicle' ? 'Add engine details, performance figures, fitted features and other useful specs.' : type === 'equipment' ? 'Add operating hours, capacity, power requirements and other useful specs.' : 'Add materials, dimensions, care instructions and the details that help buyers choose.'}</p></div></div>}
    {addOpen && <AddSpecificationsDialog groups={applicable} selectedKeys={selectedKeys} onAdd={add} onClose={() => setAddOpen(false)}/>}
  </section>;
}
