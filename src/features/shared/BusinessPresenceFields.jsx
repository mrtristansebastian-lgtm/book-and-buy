import { BUSINESS_CATEGORIES, categoryLabel } from '../../config/businessCategories';
import { isFoodPresenceCategory, isPresenceOnlyBusiness } from '../../../functions/businessCapabilities.js';
import { useId } from 'react';
import './business-presence.css';

/** Business identity and public actions stay separate from individual listing types. */
export function BusinessPresenceFields({ website = {}, onChange }) {
  const categoryFieldId = useId();
  const food = isFoodPresenceCategory(website.categoryId);
  const presenceOnly = isPresenceOnlyBusiness({ website });
  return <div className="bb-business-presence-fields">
    <div className="grid gap-1 text-sm">
      <label className="font-semibold" htmlFor={categoryFieldId}>Business category</label>
      <select id={categoryFieldId} className="native-control-input px-4" value={website.categoryId || ''}
        onChange={event => onChange?.({ categoryId: event.target.value, profileCategory: categoryLabel(event.target.value) })}>
        <option value="">Choose your industry</option>
        {BUSINESS_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
      </select>
    </div>
    <fieldset className="bb-business-presence-options">
      <legend className="text-sm font-semibold mb-2">Public profile experience</legend>
      <div className="bb-business-presence-choices">
      <label className={`bb-business-presence-choice${!presenceOnly ? ' is-selected' : ''}${food ? ' is-disabled' : ''}`}>
        <input type="radio" name={`business-profile-mode-${categoryFieldId}`} value="commerce" checked={!presenceOnly} disabled={food}
          onChange={() => onChange?.({ profileMode: 'commerce' })} />
        <span><strong className="block">Business card with Book & Buy</strong><span className="bb-muted">Show the services and listings you make available to customers.</span></span>
      </label>
      <label className={`bb-business-presence-choice${presenceOnly ? ' is-selected' : ''}`}>
        <input type="radio" name={`business-profile-mode-${categoryFieldId}`} value="presence" checked={presenceOnly}
          onChange={() => onChange?.({ profileMode: 'presence' })} />
        <span><strong className="block">Presence-only business card</strong><span className="bb-muted">Introduce your place with photos, location, contact details and socials. No Book, Buy or checkout.</span></span>
      </label>
      </div>
    </fieldset>
    {food && <p className="bb-muted text-sm m-0" role="status">Food businesses use presence-only profiles. Customers can discover your place and contact you; bookings and orders are unavailable on Book & Buy.</p>}
    {!food && presenceOnly && <p className="bb-muted text-sm m-0">Your catalogue stays saved privately while public booking and shopping are off.</p>}
  </div>;
}
