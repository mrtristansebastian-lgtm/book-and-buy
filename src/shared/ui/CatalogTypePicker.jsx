import { Layers3, Check } from 'lucide-react';
import { groupsForExploreMode, categoriesInGroup } from '../../config/businessCategories';
import { isFoodPresenceCategory } from '../../../functions/businessCapabilities.js';
import { SetupPicker } from './SetupPicker';
import './catalog-type-picker.css';

/** Classification is selected once and drives both the setup and discovery. */
export function CatalogTypePicker({ mode = 'buy', mainCategoryId = '', subcategoryId = '', templateId = '', getTemplates, onChange }) {
  const categories = groupId => categoriesInGroup(groupId).filter(item => !isFoodPresenceCategory(item.id) && getTemplates(item.id).length);
  const groups = groupsForExploreMode(mode).filter(group => !isFoodPresenceCategory(group.id) && categories(group.id).length);
  const group = groups.find(item => item.id === mainCategoryId);
  const leaves = group ? categories(group.id) : [];
  const leaf = leaves.find(item => item.id === subcategoryId);
  const templates = leaf ? getTemplates(leaf.id) : [];
  const template = templates.find(item => item.id === templateId) || templates[0];
  const choose = (main, sub, exact) => onChange?.({ mainCategoryId: main, subcategoryId: sub, template: exact });
  return <div className="bb-catalog-classification">
    <div className="bb-catalog-classification-fields">
      <div className="bb-catalog-classification-field">
        <label><span className={group ? 'is-complete' : ''}>{group ? <Check size={12}/> : '1'}</span>Main category</label>
        <SetupPicker label="Main category" placeholder="Choose a category" value={group?.id || ''} searchable options={groups.map(item => ({ value: item.id, label: item.label }))} onChange={value => choose(value, '', null)}/>
      </div>
      <div className="bb-catalog-classification-field">
        <label><span className={leaf ? 'is-complete' : ''}>{leaf ? <Check size={12}/> : '2'}</span>Subcategory</label>
        <SetupPicker label="Subcategory" placeholder={group ? 'Choose a subcategory' : 'Choose a main category first'} value={leaf?.id || ''} disabled={!group} searchable options={leaves.map(item => ({ value: item.id, label: item.label }))} onChange={value => choose(group.id, value, getTemplates(value)[0] || null)}/>
      </div>
    </div>
    <div className={`bb-catalog-classification-summary${template ? ' is-ready' : ''}`} aria-live="polite">
      <span className="bb-catalog-classification-icon"><Layers3 size={23}/></span>
      <div>{template ? <><small>{group.label}</small><strong>{leaf.label}</strong><p>Your next steps will be tailored to this subcategory. You can add more details as you go.</p></> : <><strong>A setup that fits what you offer.</strong><p>Choose a main category and subcategory. We’ll bring up the relevant specifications for you.</p></>}</div>
    </div>
  </div>;
}
