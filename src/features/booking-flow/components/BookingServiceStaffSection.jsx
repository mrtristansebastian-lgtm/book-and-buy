import { Check } from 'lucide-react';
import { getFontFamily } from '../../../data/fonts';
import { withColorAlpha } from '../../../utils/theme';

const getStaffInitials = (name = 'Staff') => (
    String(name || 'Staff')
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase()
);

export const BookingServiceStaffSection = ({
    headingLetterSpacing,
    pageItems,
    pageTextClass,
    sectionOrder,
    selectedService,
    selectedStaffId,
    setSelectedStaffId,
    settings,
    staffOptions = [],
    staffStepNumber
}) => {
    if (!staffOptions.length) return null;

    return (
        <section data-preview-section="staff" className="pt-1" style={{ order: sectionOrder }}>
            <div className={`flex flex-col ${pageItems} ${pageTextClass} mb-6 px-1`}>
                <h3 className="text-[9px] font-bold uppercase tracking-[0.4em] mb-2 opacity-40" style={{ color: settings.bodyColor }}>{staffStepNumber} // Available Staff</h3>
                <h4
                    className="text-xl md:text-2xl font-bold tracking-tight"
                    style={{
                        color: settings.headingColor,
                        fontFamily: getFontFamily(settings.headingFontFamily || settings.fontFamily),
                        ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {})
                    }}
                >
                    Who should handle {selectedService?.name || 'this service'}?
                </h4>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" aria-label="Choose staff member for selected service">
                {staffOptions.map(staff => {
                    const isActive = selectedStaffId === staff.id;
                    return (
                        <button
                            key={staff.id}
                            type="button"
                            onClick={() => setSelectedStaffId(staff.id)}
                            className={`appearance-none outline-none focus:outline-none shrink-0 rounded-full border px-3 py-2 inline-flex items-center gap-2 transition-all ${isActive ? 'shadow-lg scale-[1.02]' : 'opacity-75 hover:opacity-100'}`}
                            style={{
                                borderColor: isActive ? (settings.primaryColor || '#000') : withColorAlpha(settings.headingColor || '#000', 9, '#000000'),
                                backgroundColor: isActive ? withColorAlpha(settings.headingColor || '#000', 2, '#000000') : 'transparent',
                                color: settings.headingColor
                            }}
                        >
                            <span
                                className="w-9 h-9 rounded-full inline-flex items-center justify-center overflow-hidden text-[10px] font-black"
                                style={{ backgroundColor: staff.color || '#111827', color: '#fff' }}
                            >
                                {staff.photoURL ? <img src={staff.photoURL} alt="" className="w-full h-full object-cover" /> : getStaffInitials(staff.name)}
                            </span>
                            <span className="text-xs font-bold pr-1 max-w-[9rem] truncate">{staff.name || 'Staff'}</span>
                            {isActive && <Check size={14} />}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
