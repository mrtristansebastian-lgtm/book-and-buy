import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Globe2, LayoutTemplate, Rocket, RotateCcw, Trash2 } from 'lucide-react';

const snapshotExcludedKeys = new Set([
  'accountProfiles',
  'googleCalendar',
  'schedule',
  'staffCalendars',
  'themeTemplates'
]);

const cloneSnapshotValue = (value) => {
  if (value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const createTemplateSnapshot = (settings = {}) => Object.entries(settings).reduce((snapshot, [key, value]) => {
  if (snapshotExcludedKeys.has(key)) return snapshot;
  const cloned = cloneSnapshotValue(value);
  if (cloned !== undefined) snapshot[key] = cloned;
  return snapshot;
}, {});

const formatTemplateDate = (createdAt) => {
  if (!createdAt) return 'Saved version';
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(createdAt));
  } catch {
    return 'Saved version';
  }
};

const getDefaultTemplateName = () => `Page version ${formatTemplateDate(Date.now())}`;

export function PublishRoom({
  bookingPageRoute,
  bookingPageUrl,
  copyToClipboard,
  onOpenBookingPage,
  onSave,
  onSettingChange,
  settings
}) {
  const savedTemplates = useMemo(() => (
    Array.isArray(settings?.themeTemplates)
      ? settings.themeTemplates.filter(template => template?.id && template?.snapshot)
      : []
  ), [settings?.themeTemplates]);
  const [templateName, setTemplateName] = useState('');
  const copyLink = () => copyToClipboard?.(bookingPageUrl, 'Booking page link');

  const saveTemplate = () => {
    if (!onSettingChange) return;
    const createdAt = Date.now();
    const nextTemplate = {
      id: `page-template-${createdAt}`,
      name: templateName.trim() || getDefaultTemplateName(),
      createdAt,
      snapshot: createTemplateSnapshot(settings)
    };
    onSettingChange('themeTemplates', [nextTemplate, ...savedTemplates].slice(0, 12));
    setTemplateName('');
  };

  const restoreTemplate = (template) => {
    if (!onSettingChange || !template?.snapshot) return;
    Object.entries(template.snapshot).forEach(([key, value]) => onSettingChange(key, cloneSnapshotValue(value)));
  };

  const deleteTemplate = (templateId) => {
    if (!onSettingChange) return;
    onSettingChange('themeTemplates', savedTemplates.filter(template => template.id !== templateId));
  };

  return (
    <div className="editor-publish-room">
      <section className="editor-publish-hero">
        <span className="editor-publish-icon">
          <Rocket size={18} aria-hidden="true" />
        </span>
        <div>
          <p>Ready when you are</p>
          <h3>Publish and test your live booking page.</h3>
          <small>Use this room for the public link, live preview, saved page versions, and final publish action.</small>
        </div>
      </section>

      <section className="editor-section-setting-group editor-publish-link-card">
        <legend>
          <span>Public link</span>
          <small>This is the client-facing booking link you can share once the page is ready.</small>
        </legend>
        <button type="button" className="editor-publish-url" onClick={copyLink} title={bookingPageUrl}>
          <Globe2 size={15} aria-hidden="true" />
          <span>
            <b>{bookingPageRoute || 'Booking page'}</b>
            <small>{bookingPageUrl}</small>
          </span>
          <Copy size={14} aria-hidden="true" />
        </button>
        <div className="editor-publish-action-row">
          <button type="button" className="editor-publish-secondary" onClick={copyLink}>
            <Copy size={14} aria-hidden="true" />
            Copy link
          </button>
          <button type="button" className="editor-publish-secondary" onClick={onOpenBookingPage}>
            <ExternalLink size={14} aria-hidden="true" />
            Open live preview
          </button>
        </div>
      </section>

      <section className="editor-section-setting-group">
        <legend>
          <span>Templates</span>
          <small>Save reusable versions of this page, then restore them when you want to return to a previous setup.</small>
        </legend>
        <div className="editor-publish-template-save">
          <label>
            <span>Version name</span>
            <input
              type="text"
              value={templateName}
              placeholder={getDefaultTemplateName()}
              onChange={(event) => setTemplateName(event.target.value)}
            />
          </label>
          <button type="button" onClick={saveTemplate}>
            <LayoutTemplate size={15} aria-hidden="true" />
            Save current page
          </button>
        </div>
        <div className="editor-publish-template-list" aria-label="Saved page templates">
          {savedTemplates.length ? savedTemplates.map((template) => (
            <article key={template.id} className="editor-publish-template-card">
              <i aria-hidden="true"><LayoutTemplate size={15} /></i>
              <span>
                <b>{template.name || 'Saved page version'}</b>
                <small>{formatTemplateDate(template.createdAt)}</small>
              </span>
              <button type="button" onClick={() => restoreTemplate(template)}>
                <RotateCcw size={13} aria-hidden="true" />
                Restore
              </button>
              <button type="button" className="is-danger" onClick={() => deleteTemplate(template.id)} aria-label={`Delete ${template.name || 'saved page version'}`}>
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </article>
          )) : (
            <div className="editor-publish-template-empty">
              <LayoutTemplate size={17} aria-hidden="true" />
              <span>
                <b>No saved page versions yet.</b>
                <small>Save one before a big design change, just like keeping a theme version in Shopify.</small>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="editor-section-setting-group editor-publish-final-card">
        <legend>
          <span>Publish</span>
          <small>Save the latest editor changes before sharing or testing the live page.</small>
        </legend>
        <button type="button" className="editor-publish-primary" onClick={onSave}>
          <CheckCircle2 size={16} aria-hidden="true" />
          Publish booking page
        </button>
      </section>
    </div>
  );
}
