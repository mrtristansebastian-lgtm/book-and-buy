import { HelpCircle, Plus, Trash2 } from 'lucide-react';

export const ProfileBusinessFaqSection = ({
  onAddFaqItem,
  onRemoveFaqItem,
  onToggleFaqFeature,
  onUpdateFaqItem,
  settings
}) => (
  <div className="business-faq-profile">
    <div className="business-faq-profile-head">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-40 block text-black">Booking Page FAQ</label>
        <h4>Questions and answers</h4>
        <p>Set the actual client-facing FAQ copy here. The editor handles how this section looks on the booking page.</p>
      </div>
      <button type="button" onClick={onToggleFaqFeature} className={settings.features?.faqEnabled ? 'is-on' : ''}>
        <span>{settings.features?.faqEnabled ? 'Shown' : 'Hidden'}</span>
        <i />
      </button>
    </div>
    {settings.features?.faqEnabled ? (
      <div className="business-faq-profile-list">
        {(settings.features?.faqs || []).map((faq, index) => (
          <article key={index} className="business-faq-profile-card">
            <div className="business-faq-profile-card-head">
              <span>FAQ {index + 1}</span>
              <button type="button" onClick={() => onRemoveFaqItem(index)} aria-label={`Remove FAQ ${index + 1}`}>
                <Trash2 size={13} />
              </button>
            </div>
            <label>
              <span>Question</span>
              <input value={faq.q} onChange={(event) => onUpdateFaqItem(index, 'q', event.target.value)} placeholder="How do I know my booking is confirmed?" />
            </label>
            <label>
              <span>Answer</span>
              <textarea value={faq.a} onChange={(event) => onUpdateFaqItem(index, 'a', event.target.value)} placeholder="You will receive an update as soon as the business approves your request." />
            </label>
          </article>
        ))}
        <button type="button" onClick={onAddFaqItem} className="business-faq-profile-add">
          <span><Plus size={15} /></span>
          <strong>Add question</strong>
        </button>
      </div>
    ) : (
      <button type="button" onClick={onToggleFaqFeature} className="business-faq-profile-empty">
        <HelpCircle size={18} />
        <span>
          <strong>FAQ is hidden</strong>
          Turn it on when you want helpful questions to appear on the booking page.
        </span>
      </button>
    )}
  </div>
);
