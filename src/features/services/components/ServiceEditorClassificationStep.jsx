import { CatalogTypePicker } from '../../../shared/ui/CatalogTypePicker';
import { getServiceBookingFormat, getServiceCategoryTemplates } from '../../../../functions/serviceTemplates';

export function ServiceEditorClassificationStep({ draft, patch }) {
  const format = getServiceBookingFormat(draft);
  const templates = id => getServiceCategoryTemplates(id).filter(template => (template.event ? 'event' : template.scheduleType === 'class_session' ? 'spot' : 'slot') === format);
  return <section className="bb-services-section">
    <h3 className="bb-services-section-title">Choose a category</h3>
    <p className="bb-services-section-lede">Choose the main category and subcategory for your {format}. We’ll tailor the details from there.</p>
    <CatalogTypePicker mode="book" mainCategoryId={draft.exploreMainCategoryId} subcategoryId={draft.exploreSubcategoryId} templateId={draft.catalogTemplateId} getTemplates={templates}
      onChange={({ mainCategoryId, subcategoryId, template }) => patch({ exploreMainCategoryId: mainCategoryId, exploreSubcategoryId: subcategoryId, catalogTemplateId: template?.id || '' })}/>
  </section>;
}
