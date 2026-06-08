import { X } from 'lucide-react';

export const BookingDateRangeDialog = ({
  bookingCustomRange,
  onClose,
  onFromChange,
  onSave,
  onToChange
}) => (
  <div className="fixed inset-0 z-[1200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="w-full sm:max-w-lg rounded-t-[1.5rem] sm:rounded-[1.25rem] bg-white border border-neutral-100 shadow-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[9px] font-bold uppercase text-neutral-400 mb-2">Custom timeframe</p>
          <h3 className="text-2xl font-bold tracking-tight text-black">Choose booking dates</h3>
          <p className="text-sm text-neutral-500 mt-2">Show only bookings inside this date range.</p>
        </div>
        <button type="button" aria-label="Close date range picker" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <label>
          <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-2">From</span>
          <input
            type="date"
            value={bookingCustomRange.from}
            onChange={(event) => onFromChange(event.target.value)}
            className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black"
          />
        </label>
        <label>
          <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-2">To</span>
          <input
            type="date"
            value={bookingCustomRange.to}
            min={bookingCustomRange.from}
            onChange={(event) => onToChange(event.target.value)}
            className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase">
          Cancel
        </button>
        <button type="button" onClick={onSave} className="h-12 rounded-full native-gradient-button text-black text-[10px] font-bold uppercase">
          Save Range
        </button>
      </div>
    </div>
  </div>
);
