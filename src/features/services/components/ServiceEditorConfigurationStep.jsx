import { Plus, X } from 'lucide-react';
import { SetupPicker } from '../../../shared/ui/SetupPicker';
import { getServiceConfigurationSchema, getServiceTemplate } from '../../../../functions/serviceTemplates';

export function ServiceEditorConfigurationStep({ draft, patch }) {
  const template = getServiceTemplate(draft.catalogTemplateId);
  const schema = getServiceConfigurationSchema(draft);
  const details = draft.serviceDetails || {};
  const extraKeys = draft.serviceSpecFields || [];
  const shown = schema.filter((field) => field.essential || extraKeys.includes(field.key) || String(details[field.key] ?? '').trim());
  const remaining = schema.filter((field) => !shown.includes(field));
  const setValue = (key, value) => patch({ serviceDetails: { ...details, [key]: value } });
  const remove = (key) => {
    const next = { ...details };
    delete next[key];
    patch({ serviceDetails: next, serviceSpecFields: extraKeys.filter((value) => value !== key) });
  };
  return <section className="bb-services-section">
    <div className="bb-services-step-head"><div>
      <h3 className="bb-services-section-title">{template?.label || 'Service'} details</h3>
      <p className="bb-services-section-lede">Help clients choose confidently. Start with the basics and add any extra details you need.</p>
    </div></div>
    <div className="bb-services-fields bb-service-config-fields">
      {shown.map((field) => <div key={field.key} className="bb-service-config-field">
        <div className="bb-service-config-field-head"><span>{field.label}</span>
          {!field.essential && <button type="button" className="bb-service-config-remove" aria-label={`Remove ${field.label}`} onClick={() => remove(field.key)}><X size={14} /></button>}
        </div>
        {field.type === 'select' ? <SetupPicker label={field.label} value={details[field.key] ?? ''}
          options={[{ value: '', label: 'Not specified' }, ...field.options.map((value) => ({ value, label: value }))]}
          onChange={(value) => setValue(field.key, value)} />
          : field.multiline ? <textarea className="native-control-input bb-services-control bb-services-textarea" rows={3}
            aria-label={field.label} value={details[field.key] ?? ''} maxLength={field.maxLength}
            placeholder="Optional" onChange={(event) => setValue(field.key, event.target.value)} />
            : <input className="native-control-input bb-services-control" aria-label={field.label}
              inputMode={field.type === 'number' ? 'numeric' : 'text'} value={details[field.key] ?? ''}
              maxLength={field.maxLength || 10} placeholder="Optional" onChange={(event) => setValue(field.key, event.target.value)} />}
      </div>)}
    </div>
    {remaining.length > 0 && <div className="bb-service-config-add">
      <span className="bb-services-field-label"><Plus size={14} /> Add a detail</span>
      <SetupPicker label="Add a service detail" placeholder="Choose another detail…" value="" searchable
        options={remaining.map((field) => ({ value: field.key, label: field.label }))}
        onChange={(key) => { if (key) patch({ serviceSpecFields: [...extraKeys, key] }); }} />
    </div>}
    <p className="bb-services-field-hint">All of these details are optional and appear on your service page when filled in.</p>
  </section>;
}
