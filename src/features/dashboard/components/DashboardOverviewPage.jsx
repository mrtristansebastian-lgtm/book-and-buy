export const DashboardOverviewPage = ({ greeting, name }) => (
  <div className="dashboard-overview-page flex-1 overflow-y-auto bg-white">
    <section data-tour="dashboard-hero" className="min-h-[calc(100dvh-6rem)] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-neutral-400">{greeting}, {name}</p>
        <h1 className="mt-5 text-5xl sm:text-6xl md:text-7xl font-black leading-none tracking-normal text-black"># Coming Soon</h1>
        <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg font-semibold leading-relaxed text-neutral-500">
          We are keeping this dashboard clean while the core workspace sections get finished first.
        </p>
      </div>
    </section>
  </div>
);
