import { useEffect, useRef } from 'react';
import { HelpCircle, Plus, Trash2 } from 'lucide-react';
import { defaultFaqItems } from '../../../config/appConfig';

export function FaqRoom({
  onAddFaqItem,
  onRemoveFaqItem,
  onToggleFaqFeature,
  onUpdateFaqItem,
  settings
}) {
  const didInitDefaults = useRef(false);
  const faqEnabled = settings.features?.faqEnabled;
  const faqItems = settings.features?.faqs || [];
  const displayFaqItems = faqItems.length ? faqItems : defaultFaqItems;

  useEffect(() => {
    if (didInitDefaults.current) return;
    didInitDefaults.current = true;
    if (faqEnabled !== true) {
      onToggleFaqFeature();
      return;
    }
    if (faqItems.length === 0) {
      defaultFaqItems.forEach((item, index) => {
        onUpdateFaqItem(index, 'q', item.q);
        onUpdateFaqItem(index, 'a', item.a);
      });
    }
  }, [faqEnabled, faqItems.length, onToggleFaqFeature, onUpdateFaqItem]);

  return (
    <div className={`cinema-faq-editor ${faqEnabled ? 'is-on' : ''}`}>
      <div className="cinema-faq-editor-head">
        <div>
          <strong>Booking questions</strong>
          <small>Add the answers clients need before they place a booking.</small>
        </div>
        <button type="button" onClick={onToggleFaqFeature} className={faqEnabled ? 'is-on' : ''}>
          <span>{faqEnabled ? 'Shown' : 'Hidden'}</span>
          <i />
        </button>
      </div>

      {faqEnabled ? (
        <>
          <div className="cinema-faq-list">
            {displayFaqItems.map((faq, index) => (
              <article key={index} className="cinema-faq-card">
                <div className="cinema-faq-card-head">
                  <span>Q{index + 1}</span>
                  <button type="button" onClick={() => onRemoveFaqItem(index)} aria-label={`Remove question ${index + 1}`}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <label className="cinema-text-card">
                  <span>Question</span>
                  <input value={faq.q} onChange={(event) => onUpdateFaqItem(index, 'q', event.target.value)} placeholder="How do I know my booking is confirmed?" />
                </label>
                <label className="cinema-text-card cinema-subtext-card">
                  <span>Answer</span>
                  <textarea value={faq.a} onChange={(event) => onUpdateFaqItem(index, 'a', event.target.value)} placeholder="You will receive an update as soon as the business approves your request." />
                </label>
              </article>
            ))}
          </div>
          <button type="button" onClick={onAddFaqItem} className="cinema-faq-add">
            <Plus size={15} />
            Add question
          </button>
        </>
      ) : (
        <button type="button" onClick={onToggleFaqFeature} className="cinema-faq-empty">
          <HelpCircle size={18} />
          <span>
            <strong>FAQ is hidden</strong>
            Turn this on to show booking questions in the live preview and public page.
          </span>
        </button>
      )}
    </div>
  );
}
