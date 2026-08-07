import { useState } from 'react';
import { Clapperboard, ImagePlus, Type, X } from 'lucide-react';
import { ImagePostComposer } from './ImagePostComposer';
import { VideoPostComposer } from './VideoPostComposer';
import { TextPostComposer } from './TextPostComposer';

const CREATE_ACTIONS = [
  {
    id: 'posts',
    label: 'New post',
    hint: '4:5 photo',
    Icon: ImagePlus,
    sheetEyebrow: 'New post',
    sheetTitle: 'Publish a photo',
    sheetLede: 'Instagram 4:5 · goes live immediately'
  },
  {
    id: 'videos',
    label: 'New video',
    hint: '16:9 clip',
    Icon: Clapperboard,
    sheetEyebrow: 'New video',
    sheetTitle: 'Publish a video',
    sheetLede: '16:9 · goes live immediately'
  },
  {
    id: 'text',
    label: 'New text update',
    hint: 'Short note',
    Icon: Type,
    sheetEyebrow: 'New text update',
    sheetTitle: 'Publish a note',
    sheetLede: 'Goes live immediately'
  }
];

function ComposeSheet({ kind, onClose, onAddSocialPost }) {
  const meta = CREATE_ACTIONS.find((action) => action.id === kind);
  if (!meta) return null;

  const Composer =
    kind === 'videos' ? VideoPostComposer : kind === 'text' ? TextPostComposer : ImagePostComposer;

  return (
    <div
      className="bb-social-studio-sheet bb-social-studio-sheet--compose"
      role="dialog"
      aria-modal="true"
      aria-label={meta.sheetTitle}
    >
      <div className="bb-social-studio-sheet-backdrop" onClick={onClose} />
      <div className="bb-social-studio-sheet-panel bb-social-studio-sheet-panel--compose">
        <header className="bb-social-studio-sheet-head">
          <div>
            <p className="bb-social-studio-sheet-eyebrow">{meta.sheetEyebrow}</p>
            <h3 className="bb-social-studio-sheet-title">{meta.sheetTitle}</h3>
            <p className="bb-social-studio-sheet-lede">{meta.sheetLede}</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-social-studio-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="bb-social-studio-sheet-body bb-social-studio-sheet-body--compose">
          <Composer embedded onAddSocialPost={onAddSocialPost} />
        </div>
      </div>
    </div>
  );
}

/**
 * Create bar — polished buttons that open compose modals.
 */
export function SocialStudioCompose({ onAddSocialPost, onOpenCreate }) {
  const [composeKind, setComposeKind] = useState(null);

  const open = (id) => {
    setComposeKind(id);
    onOpenCreate?.(id);
  };

  const close = () => setComposeKind(null);

  const handleAdd = (post) => {
    onAddSocialPost?.(post);
    close();
  };

  return (
    <>
      <section className="bb-social-studio-create" aria-label="Create">
        <div className="bb-social-studio-create-copy">
          <p className="bb-social-studio-create-eyebrow">Publish</p>
          <h2 className="bb-social-studio-create-title">Add to your blog</h2>
        </div>
        <div className="bb-social-studio-create-actions">
          {CREATE_ACTIONS.map(({ id, label, hint, Icon }) => (
            <button
              key={id}
              type="button"
              className="bb-social-studio-create-btn"
              onClick={() => open(id)}
            >
              <span className="bb-social-studio-create-btn-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="bb-social-studio-create-btn-copy">
                <strong>{label}</strong>
                <span>{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {composeKind ? (
        <ComposeSheet kind={composeKind} onClose={close} onAddSocialPost={handleAdd} />
      ) : null}
    </>
  );
}
