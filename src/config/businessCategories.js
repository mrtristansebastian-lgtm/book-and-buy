/** Curated Book & Buy industry presets — no medical or legal. */

export const BUSINESS_CATEGORIES = [
  // Book
  {
    id: 'beauty_hair',
    label: 'Hair salons & barbers',
    modes: ['book'],
    icon: 'Scissors',
    keywords: ['hair', 'salon', 'barber', 'cut', 'color']
  },
  {
    id: 'nails_brows',
    label: 'Nails, brows & lashes',
    modes: ['book'],
    icon: 'Sparkles',
    keywords: ['nails', 'brows', 'lashes', 'manicure']
  },
  {
    id: 'spa_wellness',
    label: 'Spa, massage & wellness',
    modes: ['book'],
    icon: 'Flower2',
    keywords: ['spa', 'massage', 'wellness', 'sauna']
  },
  {
    id: 'fitness_pt',
    label: 'Gyms & personal training',
    modes: ['book'],
    icon: 'Dumbbell',
    keywords: ['gym', 'fitness', 'training', 'pt']
  },
  {
    id: 'yoga_pilates',
    label: 'Yoga & pilates',
    modes: ['book'],
    icon: 'Heart',
    keywords: ['yoga', 'pilates']
  },
  {
    id: 'dance',
    label: 'Dance studios',
    modes: ['book'],
    icon: 'Music2',
    keywords: ['dance', 'studio']
  },
  {
    id: 'martial_arts',
    label: 'Martial arts & combat sports',
    modes: ['book'],
    icon: 'Swords',
    keywords: ['martial', 'karate', 'boxing', 'mma']
  },
  {
    id: 'sports_coaching',
    label: 'Sports coaching & clubs',
    modes: ['book'],
    icon: 'Trophy',
    keywords: ['sports', 'coaching', 'club']
  },
  {
    id: 'photography',
    label: 'Photography & video sessions',
    modes: ['book'],
    icon: 'Camera',
    keywords: ['photo', 'photography', 'video', 'shoot']
  },
  {
    id: 'music_lessons',
    label: 'Music lessons & rehearsal',
    modes: ['book'],
    icon: 'Music',
    keywords: ['music', 'lessons', 'rehearsal', 'instrument']
  },
  {
    id: 'tutoring',
    label: 'Tutoring & learning',
    modes: ['book'],
    icon: 'GraduationCap',
    keywords: ['tutor', 'tutoring', 'learning', 'education']
  },
  {
    id: 'cooking_classes',
    label: 'Cooking classes & culinary studios',
    modes: ['book'],
    icon: 'ChefHat',
    keywords: ['cooking', 'culinary', 'kitchen', 'class']
  },
  {
    id: 'craft_workshops',
    label: 'Craft & maker workshops',
    modes: ['book'],
    icon: 'Hammer',
    keywords: ['craft', 'workshop', 'maker', 'diy']
  },
  {
    id: 'body_art',
    label: 'Tattoo & piercing',
    modes: ['book'],
    icon: 'PenTool',
    keywords: ['tattoo', 'piercing', 'ink']
  },
  {
    id: 'pet_grooming',
    label: 'Pet grooming & boarding',
    modes: ['book'],
    icon: 'PawPrint',
    keywords: ['pet', 'grooming', 'boarding', 'dog', 'cat']
  },
  {
    id: 'auto_detail',
    label: 'Auto detailing & mobile wash',
    modes: ['book'],
    icon: 'Car',
    keywords: ['auto', 'detail', 'car wash', 'mobile']
  },
  {
    id: 'home_cleaning',
    label: 'Home cleaning & organizing',
    modes: ['book'],
    icon: 'Sparkle',
    keywords: ['cleaning', 'organizing', 'housekeeping']
  },
  {
    id: 'home_services',
    label: 'Handyman & home services',
    modes: ['book'],
    icon: 'Wrench',
    keywords: ['handyman', 'home', 'repair', 'fix']
  },
  {
    id: 'events',
    label: 'Events & party hosts',
    modes: ['book'],
    icon: 'PartyPopper',
    keywords: ['events', 'party', 'host']
  },
  {
    id: 'wedding_vendors',
    label: 'Wedding vendors',
    modes: ['book'],
    icon: 'Gem',
    keywords: ['wedding', 'planner', 'florist', 'dj']
  },
  {
    id: 'catering',
    label: 'Catering & private chefs',
    modes: ['book'],
    icon: 'UtensilsCrossed',
    keywords: ['catering', 'chef', 'private dining']
  },
  {
    id: 'studios_spaces',
    label: 'Studios, podcast & meeting rooms',
    modes: ['book'],
    icon: 'Mic',
    keywords: ['studio', 'podcast', 'meeting', 'coworking']
  },
  {
    id: 'rentals',
    label: 'Equipment & party rentals',
    modes: ['book'],
    icon: 'Package',
    keywords: ['rental', 'equipment', 'party hire']
  },
  {
    id: 'tours_experiences',
    label: 'Tours, outdoor & local experiences',
    modes: ['book'],
    icon: 'Compass',
    keywords: ['tour', 'outdoor', 'experience', 'adventure']
  },
  {
    id: 'kids_activities',
    label: 'Kids activities & play spaces',
    modes: ['book'],
    icon: 'Baby',
    keywords: ['kids', 'children', 'play', 'activities']
  },
  // Buy
  {
    id: 'fashion',
    label: 'Fashion & apparel',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['fashion', 'apparel', 'clothing', 'clothes']
  },
  {
    id: 'jewelry',
    label: 'Jewelry & accessories',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['jewelry', 'jewellery', 'accessories']
  },
  {
    id: 'home_decor',
    label: 'Home & decor',
    modes: ['buy'],
    icon: 'Lamp',
    keywords: ['home', 'decor', 'furniture']
  },
  {
    id: 'art_prints',
    label: 'Art & prints',
    modes: ['buy'],
    icon: 'Image',
    keywords: ['art', 'prints', 'gallery']
  },
  {
    id: 'handmade',
    label: 'Handmade & craft goods',
    modes: ['buy'],
    icon: 'Hand',
    keywords: ['handmade', 'craft', 'artisan']
  },
  {
    id: 'beauty_retail',
    label: 'Beauty & cosmetics retail',
    modes: ['buy'],
    icon: 'Sparkles',
    keywords: ['beauty', 'cosmetics', 'skincare']
  },
  {
    id: 'bakery_specialty',
    label: 'Bakeries & specialty food',
    modes: ['buy'],
    icon: 'Cookie',
    keywords: ['bakery', 'bread', 'pastry', 'food']
  },
  {
    id: 'restaurants_takeaways',
    label: 'Restaurants & takeaways',
    modes: ['buy'],
    icon: 'UtensilsCrossed',
    keywords: ['restaurant', 'takeaway', 'takeout', 'cafe', 'dining', 'food', 'delivery']
  },
  {
    id: 'florists_retail',
    label: 'Florists',
    modes: ['buy'],
    icon: 'Flower',
    keywords: ['florist', 'flowers', 'bouquet']
  },
  {
    id: 'pet_supplies',
    label: 'Pet supplies',
    modes: ['buy'],
    icon: 'PawPrint',
    keywords: ['pet', 'supplies', 'food']
  },
  {
    id: 'sports_gear',
    label: 'Sports & outdoor gear',
    modes: ['buy'],
    icon: 'Bike',
    keywords: ['sports', 'gear', 'outdoor', 'equipment']
  },
  {
    id: 'books_stationery',
    label: 'Books & stationery',
    modes: ['buy'],
    icon: 'BookOpen',
    keywords: ['books', 'stationery', 'paper']
  },
  {
    id: 'electronics_acc',
    label: 'Electronics accessories',
    modes: ['buy'],
    icon: 'Smartphone',
    keywords: ['electronics', 'accessories', 'gadgets']
  },
  {
    id: 'vintage_thrift',
    label: 'Vintage & thrift',
    modes: ['buy'],
    icon: 'ShoppingBag',
    keywords: ['vintage', 'thrift', 'secondhand']
  },
  {
    id: 'digital_goods',
    label: 'Digital downloads & creative assets',
    modes: ['buy'],
    icon: 'Download',
    keywords: ['digital', 'download', 'assets', 'templates']
  }
];

const BY_ID = new Map(BUSINESS_CATEGORIES.map((item) => [item.id, item]));

export function getCategoryById(id) {
  return BY_ID.get(String(id || '').trim()) || null;
}

export function categoryLabel(id, fallback = '') {
  const key = String(id || '').trim();
  if (key === 'mode:book') return 'Book';
  if (key === 'mode:buy') return 'Buy';
  if (key.startsWith('group:')) {
    const group = getCategoryGroupById(key.slice('group:'.length));
    return group?.label || String(fallback || '').trim();
  }
  const group = getCategoryGroupById(key);
  if (group) return group.label;
  const hit = getCategoryById(key);
  return hit?.label || String(fallback || '').trim();
}

/** Explore search chips for Book / Buy mode filters. */
export const EXPLORE_MODE_FILTERS = [
  { id: 'mode:book', label: 'Book', mode: 'book' },
  { id: 'mode:buy', label: 'Buy', mode: 'buy' }
];

export function isExploreModeFilterId(id) {
  return id === 'mode:book' || id === 'mode:buy';
}

export function isExploreGroupFilterId(id) {
  return String(id || '').startsWith('group:');
}

export function exploreModeFromFilterId(id) {
  if (id === 'mode:book') return 'book';
  if (id === 'mode:buy') return 'buy';
  return '';
}

export function exploreGroupIdFromFilterId(id) {
  const key = String(id || '').trim();
  if (key.startsWith('group:')) return key.slice('group:'.length);
  return getCategoryGroupById(key) ? key : '';
}

export function categoriesForMode(mode = 'all') {
  if (mode === 'all') return BUSINESS_CATEGORIES;
  return BUSINESS_CATEGORIES.filter((item) => item.modes.includes(mode));
}

/**
 * Expand explore chip ids (mode:*, group:*, leaf ids) into leaf category ids.
 * Modes + groups/leaves → intersection; otherwise union of whatever is selected.
 */
export function expandExploreCategoryFilter(categoryIds = []) {
  const modes = new Set();
  const fromGroups = new Set();
  const leaves = new Set();

  for (const raw of categoryIds || []) {
    const id = String(raw || '').trim();
    if (!id) continue;
    const mode = exploreModeFromFilterId(id);
    if (mode) {
      modes.add(mode);
      continue;
    }
    const groupId = exploreGroupIdFromFilterId(id);
    if (groupId) {
      for (const item of categoriesInGroup(groupId)) fromGroups.add(item.id);
      continue;
    }
    leaves.add(id);
  }

  const explicit = new Set([...fromGroups, ...leaves]);
  let modeSet = null;
  if (modes.size) {
    modeSet = new Set();
    for (const item of BUSINESS_CATEGORIES) {
      if (item.modes.some((m) => modes.has(m))) modeSet.add(item.id);
    }
  }

  if (!modeSet && !explicit.size) return null;
  if (modeSet && explicit.size) {
    return new Set([...explicit].filter((id) => modeSet.has(id)));
  }
  if (modeSet) return modeSet;
  return explicit;
}

export function searchCategories(query = '', mode = 'all') {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const list = categoriesForMode(mode);
  if (!q) return list;
  return list.filter((item) => {
    const hay = [item.label, item.id, ...(item.keywords || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

/** Common serve-country chips for online / hybrid venues. */
export const SERVE_COUNTRY_OPTIONS = [
  { code: '*', label: 'Worldwide' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'IE', label: 'Ireland' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'IN', label: 'India' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'KE', label: 'Kenya' }
];

export const DISTANCE_RINGS_KM = [5, 15, 30, 50, 100];

/** Parent groups for Explore browse — leaves stay as BUSINESS_CATEGORIES ids. */
export const BUSINESS_CATEGORY_GROUPS = [
  {
    id: 'beauty_body',
    label: 'Beauty & body',
    icon: 'Sparkles',
    keywords: ['beauty', 'hair', 'nails', 'spa', 'tattoo'],
    categoryIds: ['beauty_hair', 'nails_brows', 'spa_wellness', 'body_art', 'beauty_retail']
  },
  {
    id: 'fitness_movement',
    label: 'Fitness & movement',
    icon: 'Dumbbell',
    keywords: ['fitness', 'gym', 'yoga', 'dance', 'sports'],
    categoryIds: ['fitness_pt', 'yoga_pilates', 'dance', 'martial_arts', 'sports_coaching']
  },
  {
    id: 'learn_create',
    label: 'Learn & create',
    icon: 'GraduationCap',
    keywords: ['learn', 'class', 'workshop', 'photo', 'music', 'tutor'],
    categoryIds: [
      'tutoring',
      'music_lessons',
      'cooking_classes',
      'craft_workshops',
      'photography'
    ]
  },
  {
    id: 'food_drink',
    label: 'Food & drink',
    icon: 'UtensilsCrossed',
    keywords: ['food', 'restaurant', 'bakery', 'catering', 'cafe'],
    categoryIds: ['restaurants_takeaways', 'bakery_specialty', 'catering']
  },
  {
    id: 'home_property',
    label: 'Home & property',
    icon: 'Home',
    keywords: ['home', 'clean', 'handyman', 'decor'],
    categoryIds: ['home_cleaning', 'home_services', 'home_decor']
  },
  {
    id: 'pets',
    label: 'Pets',
    icon: 'PawPrint',
    keywords: ['pet', 'dog', 'cat', 'grooming'],
    categoryIds: ['pet_grooming', 'pet_supplies']
  },
  {
    id: 'auto',
    label: 'Auto',
    icon: 'Car',
    keywords: ['auto', 'car', 'detail', 'wash'],
    categoryIds: ['auto_detail']
  },
  {
    id: 'events_celebrate',
    label: 'Events & celebrate',
    icon: 'PartyPopper',
    keywords: ['event', 'wedding', 'party', 'florist', 'rental'],
    categoryIds: ['events', 'wedding_vendors', 'florists_retail', 'rentals']
  },
  {
    id: 'experiences_kids',
    label: 'Experiences & kids',
    icon: 'Ticket',
    keywords: ['tour', 'kids', 'experience', 'studio', 'play'],
    categoryIds: ['tours_experiences', 'kids_activities', 'studios_spaces']
  },
  {
    id: 'shop_style',
    label: 'Shop & style',
    icon: 'ShoppingBag',
    keywords: ['shop', 'fashion', 'retail', 'vintage', 'digital'],
    categoryIds: [
      'fashion',
      'jewelry',
      'art_prints',
      'handmade',
      'vintage_thrift',
      'sports_gear',
      'books_stationery',
      'electronics_acc',
      'digital_goods'
    ]
  }
];

const GROUP_BY_ID = new Map(BUSINESS_CATEGORY_GROUPS.map((g) => [g.id, g]));

export function getCategoryGroupById(id) {
  return GROUP_BY_ID.get(String(id || '').trim()) || null;
}

export function categoriesInGroup(groupId) {
  const group = getCategoryGroupById(groupId);
  if (!group) return [];
  return group.categoryIds.map((id) => getCategoryById(id)).filter(Boolean);
}

export function searchCategoryGroups(query = '') {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return BUSINESS_CATEGORY_GROUPS;
  return BUSINESS_CATEGORY_GROUPS.filter((group) => {
    const hay = [group.label, group.id, ...(group.keywords || [])].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
