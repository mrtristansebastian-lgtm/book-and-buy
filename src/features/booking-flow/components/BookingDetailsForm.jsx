import { getFontFamily } from '../../../data/fonts';

export const BookingDetailsForm = ({
    collectClientEmail,
    collectClientName,
    collectClientNotes,
    collectClientPhone,
    detailsStepNumber,
    formData,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    isWaitlistMode,
    layout = 'page',
    onInspect,
    onSettingChange,
    pageItems,
    pageTextClass,
    previewInspectEnabled,
    sectionOrder,
    setFormData,
    settings,
    showServiceStep
}) => (
    <section className={layout === 'checkout' ? 'pt-5' : 'pt-10'} style={{ order: sectionOrder ?? (showServiceStep ? 5 : 4) }}>
        <div className={`flex flex-col ${pageItems} ${pageTextClass} ${layout === 'checkout' ? 'mb-3' : 'mb-8'} px-1 ${inspectClass}`} data-preview-section="form" onClick={() => previewInspectEnabled && onInspect('form')}>
            <h3 className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-1.5' : 'text-[9px] tracking-[0.4em] mb-2'} font-bold uppercase opacity-40`} style={{ color: settings.bodyColor }} contentEditable={previewInspectEnabled} suppressContentEditableWarning onBlur={(event) => isPreview && onSettingChange?.('detailsHeading', event.currentTarget.textContent.replace(/^\d+\s*\/\/\s*/i, '').trim())}>{detailsStepNumber} // {settings.detailsHeading || "Your Details"}</h3>
            <h4 className={`${layout === 'checkout' ? 'sr-only' : 'text-xl md:text-2xl'} font-bold tracking-tight`} style={{ color: settings.headingColor, fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily), ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                {isWaitlistMode ? 'Join Standby' : (settings.detailsSubHeading || "Secure Your Slot")}
            </h4>
        </div>

        <div className={`${layout === 'checkout' ? 'grid gap-3 md:grid-cols-2' : 'space-y-10'} px-1`}>
            {collectClientName && (
                <div className="booking-text-field group relative">
                    <label className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-2' : 'text-[9px] md:text-[10px] tracking-[0.5em] mb-3'} font-bold uppercase opacity-40 block group-focus-within:opacity-100 transition-opacity`} style={{ color: settings.bodyColor }}>Full Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`booking-text-control w-full bg-transparent ${layout === 'checkout' ? 'text-base md:text-lg' : 'text-lg md:text-xl'} font-normal outline-none tracking-normal transition-all`} style={{ color: settings.bodyColor }} />
                </div>
            )}
            {collectClientPhone && (
                <div className="booking-text-field group relative">
                    <label className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-2' : 'text-[9px] md:text-[10px] tracking-[0.5em] mb-3'} font-bold uppercase opacity-40 block group-focus-within:opacity-100 transition-opacity`} style={{ color: settings.bodyColor }}>Mobile Number</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={`booking-text-control w-full bg-transparent ${layout === 'checkout' ? 'text-base md:text-lg' : 'text-lg md:text-xl'} font-normal outline-none tracking-normal transition-all`} style={{ color: settings.bodyColor }} />
                </div>
            )}
            {collectClientEmail && (
                <div className="booking-text-field group relative">
                    <label className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-2' : 'text-[9px] md:text-[10px] tracking-[0.5em] mb-3'} font-bold uppercase opacity-40 block group-focus-within:opacity-100 transition-opacity`} style={{ color: settings.bodyColor }}>Email Address</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={`booking-text-control w-full bg-transparent ${layout === 'checkout' ? 'text-base md:text-lg' : 'text-lg md:text-xl'} font-normal outline-none tracking-normal transition-all`} style={{ color: settings.bodyColor }} />
                </div>
            )}
            {collectClientNotes && (
                <div className={`booking-text-field group relative ${layout === 'checkout' ? 'md:col-span-2' : ''}`}>
                    <label className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-2' : 'text-[9px] md:text-[10px] tracking-[0.5em] mb-3'} font-bold uppercase opacity-40 block group-focus-within:opacity-100 transition-opacity flex justify-between`} style={{ color: settings.bodyColor }}>Booking Note <span className="opacity-50 lowercase tracking-normal font-normal">Optional</span></label>
                    <textarea value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} rows={layout === 'checkout' ? 2 : 3} className={`booking-text-control w-full bg-transparent ${layout === 'checkout' ? 'text-base md:text-lg' : 'text-lg md:text-xl'} font-normal outline-none tracking-normal transition-all resize-none`} style={{ color: settings.bodyColor }} />
                </div>
            )}
            {settings.features?.birthday && (
                <div className="booking-text-field group relative">
                    <label className={`${layout === 'checkout' ? 'text-[8px] tracking-[0.28em] mb-2' : 'text-[9px] md:text-[10px] tracking-[0.5em] mb-3'} font-bold uppercase opacity-40 block group-focus-within:opacity-100 transition-opacity flex justify-between`} style={{ color: settings.bodyColor }}>Birthday <span className="opacity-50 lowercase tracking-normal font-normal">Optional</span></label>
                    <input type="text" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} className={`booking-text-control w-full bg-transparent ${layout === 'checkout' ? 'text-base md:text-lg' : 'text-lg md:text-xl'} font-normal outline-none tracking-normal transition-all`} style={{ color: settings.bodyColor }} />
                </div>
            )}
        </div>
    </section>
);
