import './showcase.css';

export function DemoShowcaseIntro({ isDemo, kind = 'product', categories = [], category = '', onCategoryChange }) {
  if (!isDemo) return null;
  const service = kind === 'service';
  return <section className="bb-showcase-intro" aria-label="Book and Buy showcase">
    <strong>Explore what you can {service ? 'book' : 'sell'} on Book &amp; Buy</strong>
    <p>{service ? 'Explore every supported service setup: Slots and Spots. Open an example to see what it demonstrates, then try its editor.' : 'Explore every supported product category and electronics setup. Open an example to explore its specs, options and selling flow.'} Your changes stay on this device. Reset the showcase in Account settings to start again.</p>
    {onCategoryChange && categories.length > 0 && <div className="bb-showcase-filters" role="group" aria-label="Showcase Store Categories">
      <button type="button" className="bb-showcase-filter" aria-pressed={!category} onClick={() => onCategoryChange('')}>All examples</button>
      {categories.map(value => <button key={value} type="button" className="bb-showcase-filter" aria-pressed={category === value} onClick={() => onCategoryChange(value)}>{value}</button>)}
    </div>}
  </section>;
}
