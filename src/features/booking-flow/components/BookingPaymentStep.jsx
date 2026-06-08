import { getPaymentOptionDisplay } from '../utils/checkoutUtils';

export const BookingPaymentStep = ({
  checkoutUrl,
  error,
  isStarting,
  onBackToSuccess,
  onStartPayment,
  selectedPaymentOption,
}) => {
  const display = getPaymentOptionDisplay(selectedPaymentOption);
  return (
    <div className="min-h-full p-6 md:p-12 relative z-10 animate-in fade-in slide-in-from-bottom-20 duration-700">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-black/10 bg-white p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.34em] text-black/35">Secure payment</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-black md:text-6xl">{display.label}</h2>
        <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-black/50">
          Your booking request is saved. Continue to the secure payment page to complete payment.
        </p>
        {error && <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStartPayment}
            disabled={isStarting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-7 text-[10px] font-black uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isStarting ? 'Starting payment' : checkoutUrl ? 'Open secure payment' : 'Continue to secure payment'}
          </button>
          <button
            type="button"
            onClick={onBackToSuccess}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 px-7 text-[10px] font-black uppercase tracking-widest text-black/55 transition-colors hover:text-black"
          >
            Do this later
          </button>
        </div>
      </section>
    </div>
  );
};
