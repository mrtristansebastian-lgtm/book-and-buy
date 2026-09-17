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
  // Buy — legacy leaves (kept for existing categoryId values) + new subcategories
  {
    id: 'fashion',
    label: 'Fashion & apparel',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['fashion', 'apparel', 'clothing', 'clothes']
  },
  {
    id: 'fashion_womens',
    label: 'Women’s fashion',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['women', 'womens', 'fashion', 'dress']
  },
  {
    id: 'fashion_mens',
    label: 'Men’s fashion',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['men', 'mens', 'fashion']
  },
  {
    id: 'fashion_kids',
    label: 'Kids’ fashion',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['kids', 'children', 'fashion']
  },
  {
    id: 'fashion_streetwear',
    label: 'Streetwear',
    modes: ['buy'],
    icon: 'Shirt',
    keywords: ['streetwear', 'sneakers', 'urban']
  },
  {
    id: 'jewelry',
    label: 'Jewelry & accessories',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['jewelry', 'jewellery', 'accessories']
  },
  {
    id: 'jewelry_fine',
    label: 'Fine jewelry',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['fine', 'gold', 'diamond', 'jewelry']
  },
  {
    id: 'jewelry_fashion',
    label: 'Fashion jewelry',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['fashion', 'costume', 'jewelry']
  },
  {
    id: 'jewelry_watches',
    label: 'Watches',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['watch', 'watches', 'timepiece']
  },
  {
    id: 'jewelry_bags',
    label: 'Bags & wallets',
    modes: ['buy'],
    icon: 'Gem',
    keywords: ['bag', 'handbag', 'wallet', 'purse']
  },
  {
    id: 'art_prints',
    label: 'Art & prints',
    modes: ['buy'],
    icon: 'Image',
    keywords: ['art', 'prints', 'gallery']
  },
  {
    id: 'art_originals',
    label: 'Original art',
    modes: ['buy'],
    icon: 'Image',
    keywords: ['original', 'painting', 'artwork']
  },
  {
    id: 'art_print_editions',
    label: 'Print editions',
    modes: ['buy'],
    icon: 'Image',
    keywords: ['print', 'poster', 'edition']
  },
  {
    id: 'art_photo_prints',
    label: 'Photo prints',
    modes: ['buy'],
    icon: 'Image',
    keywords: ['photo', 'print', 'photography']
  },
  {
    id: 'handmade',
    label: 'Handmade & craft goods',
    modes: ['buy'],
    icon: 'Hand',
    keywords: ['handmade', 'craft', 'artisan']
  },
  {
    id: 'handmade_ceramics',
    label: 'Ceramics',
    modes: ['buy'],
    icon: 'Hand',
    keywords: ['ceramic', 'pottery', 'clay']
  },
  {
    id: 'handmade_textiles',
    label: 'Textiles',
    modes: ['buy'],
    icon: 'Hand',
    keywords: ['textile', 'fabric', 'woven']
  },
  {
    id: 'handmade_gifts',
    label: 'Handmade gifts',
    modes: ['buy'],
    icon: 'Hand',
    keywords: ['gift', 'handmade', 'present']
  },
  {
    id: 'vintage_thrift',
    label: 'Vintage & thrift',
    modes: ['buy'],
    icon: 'ShoppingBag',
    keywords: ['vintage', 'thrift', 'secondhand']
  },
  {
    id: 'vintage_clothing',
    label: 'Vintage clothing',
    modes: ['buy'],
    icon: 'ShoppingBag',
    keywords: ['vintage', 'clothing', 'thrift']
  },
  {
    id: 'vintage_home',
    label: 'Vintage home',
    modes: ['buy'],
    icon: 'ShoppingBag',
    keywords: ['vintage', 'home', 'furniture']
  },
  {
    id: 'vintage_collectibles',
    label: 'Collectibles',
    modes: ['buy'],
    icon: 'ShoppingBag',
    keywords: ['collectible', 'antique', 'rare']
  },
  {
    id: 'sports_gear',
    label: 'Sports & outdoor gear',
    modes: ['buy'],
    icon: 'Bike',
    keywords: ['sports', 'gear', 'outdoor', 'equipment']
  },
  {
    id: 'sports_apparel',
    label: 'Sports apparel',
    modes: ['buy'],
    icon: 'Bike',
    keywords: ['sports', 'apparel', 'athleisure']
  },
  {
    id: 'sports_equipment',
    label: 'Sports equipment',
    modes: ['buy'],
    icon: 'Bike',
    keywords: ['equipment', 'gear', 'sports']
  },
  {
    id: 'sports_outdoor',
    label: 'Outdoor gear',
    modes: ['buy'],
    icon: 'Bike',
    keywords: ['outdoor', 'camping', 'hiking']
  },
  {
    id: 'books_stationery',
    label: 'Books & stationery',
    modes: ['buy'],
    icon: 'BookOpen',
    keywords: ['books', 'stationery', 'paper']
  },
  {
    id: 'books_reading',
    label: 'Books',
    modes: ['buy'],
    icon: 'BookOpen',
    keywords: ['book', 'reading', 'novel']
  },
  {
    id: 'books_stationery_supplies',
    label: 'Stationery',
    modes: ['buy'],
    icon: 'BookOpen',
    keywords: ['stationery', 'pen', 'notebook']
  },
  {
    id: 'books_journals',
    label: 'Journals & planners',
    modes: ['buy'],
    icon: 'BookOpen',
    keywords: ['journal', 'planner', 'diary']
  },
  {
    id: 'electronics_acc',
    label: 'Electronics accessories',
    modes: ['buy'],
    icon: 'Smartphone',
    keywords: ['electronics', 'accessories', 'gadgets']
  },
  {
    id: 'electronics_phone',
    label: 'Phone accessories',
    modes: ['buy'],
    icon: 'Smartphone',
    keywords: ['phone', 'case', 'charger']
  },
  {
    id: 'electronics_audio',
    label: 'Audio',
    modes: ['buy'],
    icon: 'Smartphone',
    keywords: ['audio', 'headphones', 'earbuds']
  },
  {
    id: 'electronics_gifts',
    label: 'Tech gifts',
    modes: ['buy'],
    icon: 'Smartphone',
    keywords: ['tech', 'gadget', 'gift']
  },
  {
    id: 'digital_goods',
    label: 'Digital downloads & creative assets',
    modes: ['buy'],
    icon: 'Download',
    keywords: ['digital', 'download', 'assets', 'templates']
  },
  {
    id: 'digital_templates',
    label: 'Templates',
    modes: ['buy'],
    icon: 'Download',
    keywords: ['template', 'canva', 'digital']
  },
  {
    id: 'digital_fonts',
    label: 'Fonts & graphics',
    modes: ['buy'],
    icon: 'Download',
    keywords: ['font', 'graphic', 'illustration']
  },
  {
    id: 'digital_courses',
    label: 'Digital courses',
    modes: ['buy'],
    icon: 'Download',
    keywords: ['course', 'ebook', 'download']
  },
  {
    id: 'beauty_retail',
    label: 'Beauty & cosmetics retail',
    modes: ['buy'],
    icon: 'Sparkles',
    keywords: ['beauty', 'cosmetics', 'skincare']
  },
  {
    id: 'beauty_skincare',
    label: 'Skincare',
    modes: ['buy'],
    icon: 'Sparkles',
    keywords: ['skincare', 'serum', 'moisturizer']
  },
  {
    id: 'beauty_makeup',
    label: 'Makeup',
    modes: ['buy'],
    icon: 'Sparkles',
    keywords: ['makeup', 'cosmetics', 'lipstick']
  },
  {
    id: 'beauty_haircare',
    label: 'Haircare',
    modes: ['buy'],
    icon: 'Sparkles',
    keywords: ['haircare', 'shampoo', 'hair']
  },
  {
    id: 'home_decor',
    label: 'Home & decor',
    modes: ['buy'],
    icon: 'Lamp',
    keywords: ['home', 'decor', 'furniture']
  },
  {
    id: 'home_furniture',
    label: 'Furniture',
    modes: ['buy'],
    icon: 'Lamp',
    keywords: ['furniture', 'sofa', 'table']
  },
  {
    id: 'home_soft',
    label: 'Soft furnishings',
    modes: ['buy'],
    icon: 'Lamp',
    keywords: ['cushion', 'linen', 'rug', 'textile']
  },
  {
    id: 'home_accents',
    label: 'Home accents',
    modes: ['buy'],
    icon: 'Lamp',
    keywords: ['accent', 'vase', 'candle', 'decor']
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
    id: 'food_bakery',
    label: 'Bakery boxes',
    modes: ['buy'],
    icon: 'Cookie',
    keywords: ['bakery', 'pastry', 'cake']
  },
  {
    id: 'food_pantry',
    label: 'Specialty pantry',
    modes: ['buy'],
    icon: 'Cookie',
    keywords: ['pantry', 'specialty', 'gourmet']
  },
  {
    id: 'food_prepared',
    label: 'Prepared meals',
    modes: ['buy'],
    icon: 'UtensilsCrossed',
    keywords: ['prepared', 'meal', 'takeaway']
  },
  {
    id: 'florists_retail',
    label: 'Florists',
    modes: ['buy'],
    icon: 'Flower',
    keywords: ['florist', 'flowers', 'bouquet']
  },
  {
    id: 'florist_bouquets',
    label: 'Bouquets',
    modes: ['buy'],
    icon: 'Flower',
    keywords: ['bouquet', 'flowers', 'arrangement']
  },
  {
    id: 'florist_plants',
    label: 'Plants',
    modes: ['buy'],
    icon: 'Flower',
    keywords: ['plant', 'succulent', 'indoor']
  },
  {
    id: 'florist_events',
    label: 'Event flowers',
    modes: ['buy'],
    icon: 'Flower',
    keywords: ['wedding', 'event', 'flowers']
  },
  {
    id: 'pet_supplies',
    label: 'Pet supplies',
    modes: ['buy'],
    icon: 'PawPrint',
    keywords: ['pet', 'supplies', 'food']
  },
  {
    id: 'pet_food',
    label: 'Pet food',
    modes: ['buy'],
    icon: 'PawPrint',
    keywords: ['pet', 'food', 'treats']
  },
  {
    id: 'pet_toys',
    label: 'Pet toys',
    modes: ['buy'],
    icon: 'PawPrint',
    keywords: ['pet', 'toy', 'play']
  },
  {
    id: 'pet_grooming_products',
    label: 'Grooming products',
    modes: ['buy'],
    icon: 'PawPrint',
    keywords: ['pet', 'grooming', 'shampoo']
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
  if (key === 'mode:both') return 'Both';
  if (key.startsWith('group:')) {
    const group = getCategoryGroupById(key.slice('group:'.length));
    return group?.label || String(fallback || '').trim();
  }
  const group = getCategoryGroupById(key);
  if (group) return group.label;
  const hit = getCategoryById(key);
  return hit?.label || String(fallback || '').trim();
}

/** Explore search chips for Book / Buy / Both mode filters. */
export const EXPLORE_MODE_FILTERS = [
  { id: 'mode:book', label: 'Book', mode: 'book' },
  { id: 'mode:buy', label: 'Buy', mode: 'buy' },
  { id: 'mode:both', label: 'Both', mode: 'both' }
];

export function isExploreModeFilterId(id) {
  return id === 'mode:book' || id === 'mode:buy' || id === 'mode:both';
}

export function isExploreGroupFilterId(id) {
  return String(id || '').startsWith('group:');
}

/**
 * Map a Recent history label back to a chip id (mode / group / leaf), or '' if free text.
 */
export function resolveExploreChipFromLabel(label = '') {
  const q = String(label || '')
    .trim()
    .toLowerCase();
  if (!q) return '';

  for (const item of EXPLORE_MODE_FILTERS) {
    if (item.label.toLowerCase() === q || item.mode === q) return item.id;
  }

  for (const group of BUSINESS_CATEGORY_GROUPS) {
    if (group.label.toLowerCase() === q || group.id.toLowerCase() === q) {
      return `group:${group.id}`;
    }
  }

  for (const item of BUSINESS_CATEGORIES) {
    if (item.label.toLowerCase() === q || item.id.toLowerCase() === q) return item.id;
  }

  return '';
}

export function exploreModeFromFilterId(id) {
  if (id === 'mode:book') return 'book';
  if (id === 'mode:buy') return 'buy';
  if (id === 'mode:both') return 'both';
  return '';
}

export function exploreGroupIdFromFilterId(id) {
  const key = String(id || '').trim();
  if (key.startsWith('group:')) return key.slice('group:'.length);
  return getCategoryGroupById(key) ? key : '';
}

export function categoriesForMode(mode = 'all') {
  if (mode === 'all' || mode === 'both') return BUSINESS_CATEGORIES;
  return BUSINESS_CATEGORIES.filter((item) => item.modes.includes(mode));
}

/** Category groups for the given explore mode (uses group.mode). */
export function groupsForExploreMode(mode = 'all') {
  if (!mode || mode === 'all' || mode === 'both') return BUSINESS_CATEGORY_GROUPS;
  return BUSINESS_CATEGORY_GROUPS.filter((group) => group.mode === mode);
}

export function bookCategoryGroups() {
  return BUSINESS_CATEGORY_GROUPS.filter((group) => group.mode === 'book');
}

export function buyCategoryGroups() {
  return BUSINESS_CATEGORY_GROUPS.filter((group) => group.mode === 'buy');
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
    if (mode === 'both') {
      modes.add('book');
      modes.add('buy');
      continue;
    }
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
    label: 'Beauty',
    mode: 'book',
    icon: 'Sparkles',
    keywords: ['beauty', 'hair', 'nails', 'spa', 'tattoo', 'body'],
    categoryIds: ['beauty_hair', 'nails_brows', 'spa_wellness', 'body_art']
  },
  {
    id: 'fitness_movement',
    label: 'Fitness',
    mode: 'book',
    icon: 'Dumbbell',
    keywords: ['fitness', 'gym', 'yoga', 'dance', 'sports', 'movement'],
    categoryIds: ['fitness_pt', 'yoga_pilates', 'dance', 'martial_arts', 'sports_coaching']
  },
  {
    id: 'learn_create',
    label: 'Learn',
    mode: 'book',
    icon: 'GraduationCap',
    keywords: ['learn', 'class', 'workshop', 'photo', 'music', 'tutor', 'create'],
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
    label: 'Food',
    mode: 'book',
    icon: 'UtensilsCrossed',
    keywords: ['food', 'catering', 'culinary', 'class'],
    categoryIds: ['catering']
  },
  {
    id: 'home_property',
    label: 'Home',
    mode: 'book',
    icon: 'Home',
    keywords: ['home', 'clean', 'handyman', 'property'],
    categoryIds: ['home_cleaning', 'home_services']
  },
  {
    id: 'pets',
    label: 'Pets',
    mode: 'book',
    icon: 'PawPrint',
    keywords: ['pet', 'dog', 'cat', 'grooming'],
    categoryIds: ['pet_grooming']
  },
  {
    id: 'auto',
    label: 'Auto',
    mode: 'book',
    icon: 'Car',
    keywords: ['auto', 'car', 'detail', 'wash'],
    categoryIds: ['auto_detail']
  },
  {
    id: 'events_celebrate',
    label: 'Events',
    mode: 'book',
    icon: 'PartyPopper',
    keywords: ['event', 'wedding', 'party', 'rental', 'celebrate'],
    categoryIds: ['events', 'wedding_vendors', 'rentals']
  },
  {
    id: 'experiences_kids',
    label: 'Experiences',
    mode: 'book',
    icon: 'Ticket',
    keywords: ['tour', 'kids', 'experience', 'studio', 'play'],
    categoryIds: ['tours_experiences', 'kids_activities', 'studios_spaces']
  },
  {
    id: 'buy_fashion',
    label: 'Fashion',
    mode: 'buy',
    icon: 'Shirt',
    keywords: ['fashion', 'apparel', 'clothing', 'clothes'],
    categoryIds: [
      'fashion',
      'fashion_womens',
      'fashion_mens',
      'fashion_kids',
      'fashion_streetwear'
    ]
  },
  {
    id: 'buy_jewelry',
    label: 'Jewelry',
    mode: 'buy',
    icon: 'Gem',
    keywords: ['jewelry', 'jewellery', 'accessories', 'watches'],
    categoryIds: [
      'jewelry',
      'jewelry_fine',
      'jewelry_fashion',
      'jewelry_watches',
      'jewelry_bags'
    ]
  },
  {
    id: 'buy_art',
    label: 'Art',
    mode: 'buy',
    icon: 'Image',
    keywords: ['art', 'prints', 'gallery'],
    categoryIds: ['art_prints', 'art_originals', 'art_print_editions', 'art_photo_prints']
  },
  {
    id: 'buy_handmade',
    label: 'Handmade',
    mode: 'buy',
    icon: 'Hand',
    keywords: ['handmade', 'craft', 'artisan'],
    categoryIds: ['handmade', 'handmade_ceramics', 'handmade_textiles', 'handmade_gifts']
  },
  {
    id: 'buy_vintage',
    label: 'Vintage',
    mode: 'buy',
    icon: 'ShoppingBag',
    keywords: ['vintage', 'thrift', 'secondhand'],
    categoryIds: [
      'vintage_thrift',
      'vintage_clothing',
      'vintage_home',
      'vintage_collectibles'
    ]
  },
  {
    id: 'buy_sports',
    label: 'Sports',
    mode: 'buy',
    icon: 'Bike',
    keywords: ['sports', 'gear', 'outdoor', 'equipment'],
    categoryIds: ['sports_gear', 'sports_apparel', 'sports_equipment', 'sports_outdoor']
  },
  {
    id: 'buy_books',
    label: 'Books',
    mode: 'buy',
    icon: 'BookOpen',
    keywords: ['books', 'stationery', 'paper'],
    categoryIds: [
      'books_stationery',
      'books_reading',
      'books_stationery_supplies',
      'books_journals'
    ]
  },
  {
    id: 'buy_electronics',
    label: 'Electronics',
    mode: 'buy',
    icon: 'Smartphone',
    keywords: ['electronics', 'accessories', 'gadgets'],
    categoryIds: [
      'electronics_acc',
      'electronics_phone',
      'electronics_audio',
      'electronics_gifts'
    ]
  },
  {
    id: 'buy_digital',
    label: 'Digital',
    mode: 'buy',
    icon: 'Download',
    keywords: ['digital', 'download', 'assets', 'templates'],
    categoryIds: ['digital_goods', 'digital_templates', 'digital_fonts', 'digital_courses']
  },
  {
    id: 'buy_beauty',
    label: 'Beauty retail',
    mode: 'buy',
    icon: 'Sparkles',
    keywords: ['beauty', 'cosmetics', 'skincare'],
    categoryIds: ['beauty_retail', 'beauty_skincare', 'beauty_makeup', 'beauty_haircare']
  },
  {
    id: 'buy_home',
    label: 'Home decor',
    mode: 'buy',
    icon: 'Lamp',
    keywords: ['home', 'decor', 'furniture'],
    categoryIds: ['home_decor', 'home_furniture', 'home_soft', 'home_accents']
  },
  {
    id: 'buy_food',
    label: 'Food & drink',
    mode: 'buy',
    icon: 'Cookie',
    keywords: ['food', 'bakery', 'restaurant', 'pantry'],
    categoryIds: [
      'bakery_specialty',
      'restaurants_takeaways',
      'food_bakery',
      'food_pantry',
      'food_prepared'
    ]
  },
  {
    id: 'buy_florists',
    label: 'Florists',
    mode: 'buy',
    icon: 'Flower',
    keywords: ['florist', 'flowers', 'bouquet'],
    categoryIds: ['florists_retail', 'florist_bouquets', 'florist_plants', 'florist_events']
  },
  {
    id: 'buy_pets',
    label: 'Pet supplies',
    mode: 'buy',
    icon: 'PawPrint',
    keywords: ['pet', 'supplies', 'food'],
    categoryIds: ['pet_supplies', 'pet_food', 'pet_toys', 'pet_grooming_products']
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
