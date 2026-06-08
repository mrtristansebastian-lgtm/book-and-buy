import { Check } from 'lucide-react';

export const ClientDetailsForm = ({
  activeClient,
  isExampleClient,
  onSaveDetails,
  showToast
}) => {
  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const saved = await onSaveDetails(activeClient.id, {
      name: String(formData.get('name') || '').trim() || activeClient.name,
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      birthday: String(formData.get('birthday') || '').trim()
    });
    if (saved) showToast('Client details saved');
  };

  return (
    <form
      key={`client-details-${activeClient.id}`}
      onSubmit={handleSubmit}
      className="client-file-details rounded-2xl border border-neutral-100 bg-neutral-50/80 p-3 md:p-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Client Details</p>
          <p className="text-xs text-neutral-500 mt-1">Update contact info without leaving the file.</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-white border border-neutral-100 px-3 py-1.5 rounded-full">
          {isExampleClient ? 'Example only' : activeClient.lastBooking ? `Last ${activeClient.lastBooking.date}` : 'No visits yet'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="client-file-field">
          <span>Name</span>
          <input name="name" defaultValue={activeClient.name || ''} disabled={isExampleClient} />
        </label>
        <label className="client-file-field">
          <span>Phone</span>
          <input name="phone" type="tel" defaultValue={activeClient.phone || ''} placeholder="Not added" disabled={isExampleClient} />
        </label>
        <label className="client-file-field">
          <span>Email</span>
          <input name="email" type="email" defaultValue={activeClient.email || ''} placeholder="Not added" disabled={isExampleClient} />
        </label>
        <label className="client-file-field">
          <span>Birthday</span>
          <input name="birthday" defaultValue={activeClient.birthday || ''} placeholder="MM/DD" disabled={isExampleClient} />
        </label>
      </div>
      <button
        type="submit"
        disabled={isExampleClient}
        className="mt-3 h-11 w-full md:w-auto px-5 rounded-xl bg-black text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Check size={15} /> {isExampleClient ? 'Example Only' : 'Save Details'}
      </button>
    </form>
  );
};
