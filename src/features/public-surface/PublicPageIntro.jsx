import { EditableText } from '../website/components/editable';

/** Simple page title + body for Book, Buy, and Business Blog. */
export function PublicPageIntro({
  title = '',
  body = '',
  editMode = false,
  titlePlaceholder = 'Page title',
  bodyPlaceholder = 'Supporting text',
  onTitleChange,
  onBodyChange
}) {
  return (
    <header className="bb-public-page-intro">
      <div className="bb-public-catalog-intro">
        <EditableText
          as="h1"
          className="bb-page-title"
          editMode={editMode}
          value={title}
          placeholder={titlePlaceholder}
          onChange={onTitleChange}
        />
        <EditableText
          as="p"
          className="bb-public-lede m-0"
          editMode={editMode}
          multiline
          value={body}
          placeholder={bodyPlaceholder}
          onChange={onBodyChange}
        />
      </div>
    </header>
  );
}
