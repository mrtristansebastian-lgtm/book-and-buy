import { Button } from '../../shared/ui/Button';
import { navigate } from '../../app/routing';
import { SHOWCASE_PRODUCT_GUIDES } from '../../data/demoShowcaseProducts';
import { serviceGuideManifest } from '../../data/demoShowcaseServices';
import './showcase.css';

export function DemoShowcaseGuide({ isDemo = false, kind = 'product', itemId, onEdit }) {
  if (!isDemo) return null;
  const guide = (kind === 'service' ? serviceGuideManifest : SHOWCASE_PRODUCT_GUIDES)[itemId];
  if (!guide) return null;
  const openSetup = () => onEdit ? onEdit() : navigate(`/demo/${kind === 'service' ? 'services' : 'products'}/edit/${encodeURIComponent(itemId)}`);
  return <section className="bb-showcase-guide" aria-label="About this showcase example">
    <span className="bb-showcase-guide-kicker">Book &amp; Buy Showcase</span>
    <h2>What this shows</h2>
    <p>{guide.whatShows}</p>
    <p><strong>Try this:</strong> {guide.tryThis}</p>
    {guide.limit && <p>{guide.limit}</p>}
    <Button action="edit" variant="secondary" type="button" onClick={openSetup}>See setup</Button>
  </section>;
}
