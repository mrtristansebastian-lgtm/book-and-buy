import { useEffect, useRef, useState } from 'react';
import { Cake, Check, Globe2, Mail, MessageCircle, PencilLine, Phone, UserRound, X } from 'lucide-react';

export const ClientDetailsForm = ({
  activeClient,
  isExampleClient,
  onSaveDetails,
  showToast
}) => {
  const formRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [activeClient.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isExampleClient || !isEditing) return;
    const formData = new FormData(event.currentTarget);
    const saved = await onSaveDetails(activeClient.id, {
      name: String(formData.get('name') || '').trim() || activeClient.name,
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      country: String(formData.get('country') || '').trim(),
      birthday: String(formData.get('birthday') || '').trim(),
      preferredContact: String(formData.get('preferredContact') || '').trim()
    });
    if (saved) {
      setIsEditing(false);
      showToast('Client details saved');
    }
  };

  const preferredContact = activeClient.preferredContact || 'Chat';
  const fieldsDisabled = isExampleClient || !isEditing;

  const cancelEditing = () => {
    formRef.current?.reset();
    setIsEditing(false);
  };

  return (
    <form
      ref={formRef}
      key={`client-details-${activeClient.id}`}
      onSubmit={handleSubmit}
      className="client-file-card client-file-details"
    >
      <div className="client-file-section-head">
        <div className="client-file-section-copy">
          <p className="client-file-kicker">Client file</p>
          <h3>Contact and preferences</h3>
          <p>Keep the details your team needs before every booking, follow-up, and support chat.</p>
        </div>
        {!isEditing && (
          <button
            type="button"
            disabled={isExampleClient}
            className="client-file-edit-action"
            onClick={() => setIsEditing(true)}
          >
            <PencilLine size={15} /> {isExampleClient ? 'Example only' : 'Edit file'}
          </button>
        )}
      </div>

      <div className="client-file-grid">
        <label className="client-file-field">
          <span><UserRound size={14} /> Name</span>
          <input name="name" defaultValue={activeClient.name || ''} disabled={fieldsDisabled} />
        </label>
        <label className="client-file-field">
          <span><Phone size={14} /> Phone</span>
          <input name="phone" type="tel" defaultValue={activeClient.phone || ''} placeholder="Not added" disabled={fieldsDisabled} />
        </label>
        <label className="client-file-field">
          <span><Mail size={14} /> Email</span>
          <input name="email" type="email" defaultValue={activeClient.email || ''} placeholder="Not added" disabled={fieldsDisabled} />
        </label>
        <label className="client-file-field">
          <span><Globe2 size={14} /> Country</span>
          <input name="country" defaultValue={activeClient.country || ''} placeholder="Not added" disabled={fieldsDisabled} />
        </label>
        <label className="client-file-field">
          <span><Cake size={14} /> Birthday</span>
          <input name="birthday" defaultValue={activeClient.birthday || ''} placeholder="MM/DD" disabled={fieldsDisabled} />
        </label>
        <label className="client-file-field">
          <span><MessageCircle size={14} /> Preferred contact</span>
          <select name="preferredContact" defaultValue={preferredContact} disabled={fieldsDisabled}>
            <option value="Chat">Chat</option>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>
        </label>
      </div>

      {isEditing && (
        <div className="client-file-save-row">
          <div className="client-file-edit-controls">
            <button
              type="button"
              className="client-file-cancel-action"
              onClick={cancelEditing}
            >
              <X size={15} /> Cancel edits
            </button>
            <button
              type="submit"
              className="client-file-primary-action"
            >
              <Check size={15} /> Save changes
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
