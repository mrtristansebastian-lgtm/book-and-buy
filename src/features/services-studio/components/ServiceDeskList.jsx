import { ArrowUpRight, Briefcase, CheckCircle2, ImagePlus, Plus, SlidersHorizontal, UsersRound } from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function ServiceDeskList({
  filteredServices,
  services,
  staffOptions,
  selectedId,
  onCreateService,
  onOpenService,
  canManageWorkspace
}) {
  return (
    <div className="service-desk-list">
      {filteredServices.length === 0 ? (
        <div className="launch-empty-state service-empty-state">
          <div className="launch-empty-icon native-gradient-icon">
            <Briefcase size={23} />
          </div>
          <p className="launch-empty-eyebrow">{services.length ? 'Filtered services' : 'Service catalog'}</p>
          <h3>{services.length ? 'No matching services' : 'Build your first service'}</h3>
          <p className="launch-empty-copy">
            {services.length
              ? 'Adjust the search, category, staff member, or visibility filter to bring services back into view.'
              : 'Each business builds its own services from scratch. Add the name, price, duration, photos, location, staff, and booking rules exactly how you sell it.'}
          </p>
          {!services.length && (
            <div className="launch-empty-steps" aria-label="Service setup steps">
              <span><SlidersHorizontal size={14} /> Set price and duration</span>
              <span><ImagePlus size={14} /> Add photos</span>
              <span><CheckCircle2 size={14} /> Publish when ready</span>
            </div>
          )}
          <button
            type="button"
            onClick={onCreateService}
            disabled={!canManageWorkspace}
            className="launch-empty-primary disabled:opacity-50"
          >
            <Plus size={14} /> Create Service
          </button>
        </div>
      ) : (
        <div className="service-desk-card-grid">
          {filteredServices.map(service => {
            const assignedStaff = staffOptions.filter(staff => (service.staffIds || []).includes(staff.id));
            const duration = service.durationMode === 'schedule' ? '' : formatServiceDuration(service.duration);
            const price = formatServicePrice(service);
            const hasImage = Boolean(service.imageUrls?.[0]);
            const scheduleTypeMeta = getScheduleTypeMeta(service.scheduleType || service.bookingType || service.serviceType);

            return (
              <article key={service.id} className={`service-desk-file-card service-booking-card-preview ${selectedId === service.id ? 'is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => onOpenService(service)}
                  className={`booking-service-option appearance-none outline-none focus:outline-none rounded-2xl border transition-all booking-service-border-soft booking-service-variant-classic ${hasImage ? 'has-service-image' : 'has-service-image has-placeholder-image'}`}
                  aria-label={`Open ${service.name || 'service'} service file`}
                >
                  <div className="booking-service-shell">
                    <div className="booking-service-image">
                      {hasImage ? (
                        <img src={service.imageUrls[0]} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span className="service-desk-booking-placeholder" aria-hidden="true">
                          <Briefcase size={24} />
                        </span>
                      )}
                    </div>
                    <div className="booking-service-copy booking-service-main">
                      <div className="booking-service-title-line">
                        <div>
                          {service.category && <span className="booking-service-eyebrow">{service.category}</span>}
                          <h5>{service.name}</h5>
                        </div>
                      </div>
                      <p className="booking-service-description">{service.description || 'No description yet.'}</p>
                    </div>
                    <div className="booking-service-meta booking-service-side booking-service-facts" aria-label="Price and duration">
                      <span className="booking-service-meta-item is-price">
                        <span className="booking-service-meta-label">Price</span>
                        <span className="booking-service-meta-value">{price || 'Quote'}</span>
                      </span>
                      {duration && (
                        <span className="booking-service-meta-item is-duration">
                          <span className="booking-service-meta-label">Duration</span>
                          <span className="booking-service-meta-value">{duration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="service-desk-file-footer">
                  <div className="service-desk-file-team">
                    <span className={`service-desk-card-status ${service.active !== false ? 'is-live' : 'is-hidden'}`}>
                      {service.active !== false ? 'Live' : 'Hidden'}
                    </span>
                    <span>{scheduleTypeMeta.singular}</span>
                    <span><UsersRound size={13} /> {assignedStaff.length > 0 ? `${assignedStaff.length} staff` : 'No staff'}</span>
                  </div>
                  <button type="button" onClick={() => onOpenService(service)} className="service-desk-card-action">
                    Open File <ArrowUpRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
