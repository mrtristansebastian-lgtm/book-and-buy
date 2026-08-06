import { navigate } from '../../app/routing';

const LINKS = [
  { id: 'home', label: 'Home', path: '' },
  { id: 'book', label: 'Book', path: '/book' },
  { id: 'shop', label: 'Shop', path: '/shop' },
  { id: 'social', label: 'Social', path: '/social' }
];

export function PublicBusinessHeader({ slug, page, brandName, pages = {} }) {
  const enabled = {
    home: pages.home !== false,
    book: pages.book !== false,
    shop: pages.shop !== false,
    social: pages.social !== false
  };

  return (
    <header className="bb-public-header">
      <button
        type="button"
        className="bb-brand-mark text-xl bg-transparent border-0 p-0 cursor-pointer"
        onClick={() => navigate(`/w/${slug}`)}
      >
        {brandName}
      </button>
      <nav className="bb-public-nav" aria-label="Public pages">
        {LINKS.filter((link) => enabled[link.id]).map((link) => (
          <a
            key={link.id}
            href={`#/w/${slug}${link.path}`}
            aria-current={page === link.id ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigate(`/w/${slug}${link.path}`);
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
