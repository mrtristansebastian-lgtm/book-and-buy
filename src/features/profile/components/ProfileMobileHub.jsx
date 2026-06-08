import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ProfileMobileHub = ({
  activeProfileSection,
  activeProfileSectionMeta,
  onSetActiveProfileSection,
  profileSections
}) => (
  <div className="profile-mobile-hub max-w-6xl mb-4">
    {!activeProfileSection ? (
      <div className="profile-command-grid">
        {profileSections.map(section => {
          const IconCmp = section.icon;
          const openSection = () => section.action ? section.action() : onSetActiveProfileSection(section.id);
          return (
            <button
              type="button"
              key={section.id}
              className="profile-command-card"
              onClick={openSection}
              aria-label={`Open ${section.title}`}
            >
              <span className="profile-command-card-top">
                <span className="profile-command-icon">
                  <IconCmp size={18} />
                </span>
                <span className="profile-command-meta">{section.meta}</span>
              </span>
              <span className="profile-command-copy">
                <span>{section.title}</span>
              </span>
              <span className="profile-command-arrow" aria-hidden="true">
                <ChevronRight size={17} />
              </span>
              <span className="profile-command-quick">
                {(section.quick || []).map(item => (
                  <span key={item}>
                    {item}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-[0_14px_36px_-30px_rgba(15,23,42,0.45)] flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSetActiveProfileSection('')}
          aria-label="Back to profile sections"
          className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-black shrink-0"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-neutral-400">Profile Section</p>
          <h3 className="text-lg font-bold tracking-tight text-black truncate">{activeProfileSectionMeta?.title}</h3>
        </div>
      </div>
    )}
  </div>
);
