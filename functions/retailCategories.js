// Shared retail departments for Discovery and the creation editors.
// Existing IDs stay stable; labels describe the expanded retail range.
export const RETAIL_MAIN_CATEGORIES = Object.freeze([
  ['buy_fashion', 'Clothing, Shoes & Accessories', 'Shirt'],
  ['buy_jewelry', 'Jewellery & Accessories', 'Gem'],
  ['buy_beauty', 'Beauty & Personal Care', 'Sparkles'],
  ['buy_home', 'Home, Kitchen & Furniture', 'Lamp'],
  ['buy_appliances', 'Appliances', 'Plug'],
  ['buy_electronics', 'Electronics & Technology', 'Smartphone'],
  ['buy_books', 'Books, Office & Stationery', 'BookOpen'],
  ['buy_toys', 'Toys & Games', 'Gamepad2'],
  ['buy_baby', 'Baby & Toddler', 'Baby'],
  ['buy_garden', 'Garden, Pool & Patio', 'Flower'],
  ['buy_sports', 'Sports & Outdoors', 'Bike'],
  ['buy_tools', 'Tools & DIY', 'Wrench'],
  ['buy_automotive', 'Automotive Parts & Accessories', 'Car'],
  ['buy_vehicles', 'Vehicles', 'Car'],
  ['buy_luggage', 'Luggage & Travel', 'ShoppingBag'],
  ['buy_household', 'Household & Cleaning', 'Home'],
  ['buy_music', 'Musical Instruments', 'Music'],
  ['buy_art', 'Art & Craft Supplies', 'Image'],
  ['buy_handmade', 'Handmade & Gifts', 'Hand'],
  ['buy_vintage', 'Vintage & Collectibles', 'ShoppingBag'],
  ['buy_florists', 'Flowers & Plants', 'Flower'],
  ['buy_pets', 'Pet Supplies', 'PawPrint'],
  ['buy_digital', 'Digital Products', 'Download']
].map(([id, label, icon]) => Object.freeze({ id, label, icon })));

const leaf = (groupId, id, label, family, keywords) => Object.freeze({ groupId, id, label, family, keywords: keywords.split(', ') });
export const RETAIL_CATEGORY_ADDITIONS = Object.freeze([
  leaf('buy_appliances', 'appliances_kitchen', 'Small kitchen appliances', 'appliance', 'air fryer, kettle, toaster, blender, coffee maker'),
  leaf('buy_appliances', 'appliances_household', 'Household appliances', 'appliance', 'vacuum, iron, fan, heater, air purifier'),
  leaf('buy_appliances', 'appliances_large', 'Large appliances', 'appliance', 'fridge, freezer, washing machine, dishwasher, oven'),
  leaf('buy_toys', 'toys_learning', 'Educational & building toys', 'toy', 'learning, building blocks, educational, construction sets'),
  leaf('buy_toys', 'toys_play', 'Indoor & outdoor play', 'toy', 'doll, pretend play, ride on, outdoor toys'),
  leaf('buy_toys', 'toys_games', 'Board games & puzzles', 'toy', 'board game, puzzle, cards, jigsaw'),
  leaf('buy_baby', 'baby_travel', 'Prams, car seats & carriers', 'baby', 'pram, stroller, car seat, carrier'),
  leaf('buy_baby', 'baby_feeding', 'Feeding accessories', 'baby', 'bottle, bib, high chair, feeding, weaning'),
  leaf('buy_baby', 'baby_nursery', 'Nursery & baby furniture', 'baby', 'cot, crib, nursery, baby room'),
  leaf('buy_baby', 'baby_changing', 'Nappies & changing', 'baby', 'nappy, diaper, changing mat, changing bag'),
  leaf('buy_garden', 'garden_gardening', 'Gardening & irrigation', 'garden', 'gardening, hose, watering, irrigation, planter'),
  leaf('buy_garden', 'garden_pool', 'Pool accessories & care', 'garden', 'pool, skimmer, filter, pool cover'),
  leaf('buy_garden', 'garden_patio', 'Patio furniture & accessories', 'furniture', 'patio, outdoor furniture, parasol, garden chair'),
  leaf('buy_garden', 'garden_braai', 'Braais & outdoor cooking', 'garden', 'braai, barbecue, grill, outdoor cooking'),
  leaf('buy_automotive', 'automotive_accessories', 'Vehicle accessories', 'automotive', 'car accessories, roof rack, seat cover, car mats'),
  leaf('buy_automotive', 'automotive_parts', 'Replacement parts', 'automotive', 'car parts, filter, brake pads, wipers'),
  leaf('buy_automotive', 'automotive_tyres', 'Tyres & wheels', 'automotive', 'tyres, tires, rims, wheels'),
  leaf('buy_automotive', 'automotive_care', 'Car care & cleaning', 'automotive', 'car shampoo, polish, detailing, microfibre'),
  leaf('buy_luggage', 'luggage_suitcases', 'Suitcases & travel bags', 'bag', 'suitcase, luggage, duffel, travel bag'),
  leaf('buy_luggage', 'luggage_accessories', 'Travel accessories', 'generic', 'packing cube, luggage lock, neck pillow, travel organiser'),
  leaf('buy_household', 'household_cleaning', 'Cleaning products & accessories', 'household', 'cleaning, detergent, mop, broom, disinfectant'),
  leaf('buy_household', 'household_laundry', 'Laundry supplies', 'household', 'laundry, washing powder, fabric softener, clothes pegs'),
  leaf('buy_household', 'household_supplies', 'Household essentials', 'household', 'bin bags, paper towel, tissue, household supplies'),
  leaf('buy_music', 'music_strings', 'Guitars & string instruments', 'instrument', 'guitar, violin, ukulele, strings'),
  leaf('buy_music', 'music_keys', 'Keyboards & pianos', 'instrument', 'keyboard, piano, digital piano'),
  leaf('buy_music', 'music_percussion', 'Drums & percussion', 'instrument', 'drums, percussion, cajon, tambourine'),
  leaf('buy_music', 'music_accessories', 'Instrument accessories', 'instrument', 'instrument stand, guitar case, tuner, music stand'),
  leaf('buy_tools', 'tools_hand', 'Hand & measuring tools', 'tool', 'hammer, screwdriver, spanner, tape measure, spirit level'),
  leaf('buy_tools', 'tools_power', 'Power tools & accessories', 'tool', 'drill, saw, sander, drill bit, power tool'),
  leaf('buy_tools', 'tools_hardware', 'Hardware & fixings', 'tool', 'screw, bolt, bracket, hinge, lock'),
  leaf('buy_tools', 'tools_electrical', 'Electrical & lighting supplies', 'tool', 'plug, extension cable, socket, light bulb, electrical'),
  leaf('buy_tools', 'tools_plumbing', 'Plumbing supplies', 'tool', 'tap, pipe, plumbing, fitting, shower head'),
  leaf('buy_beauty', 'beauty_personal_care', 'Toiletries & oral care', 'personalCare', 'toiletries, toothbrush, oral care, soap, deodorant'),
  leaf('buy_beauty', 'beauty_grooming_devices', 'Grooming devices & accessories', 'appliance', 'shaver, clipper, hair dryer, electric toothbrush'),
  leaf('buy_books', 'office_supplies', 'Office supplies & filing', 'office', 'filing, folders, stapler, office supplies'),
  leaf('buy_books', 'office_printers', 'Printers & scanners', 'officeDevice', 'printer, scanner, copier, printing'),
  leaf('buy_books', 'office_ink', 'Ink, toner & printer paper', 'office', 'ink, toner, printer paper, cartridge'),
  leaf('buy_art', 'art_craft_supplies', 'Art & craft supplies', 'craft', 'paint, brush, canvas, glue, craft supplies'),
  leaf('buy_art', 'art_sewing', 'Sewing, knitting & yarn', 'craft', 'sewing, knitting, yarn, fabric, needle'),
  leaf('buy_electronics', 'electronics_backup_power', 'Backup power & charging', 'power', 'portable power station, ups, inverter, solar charger, backup power')
]);

export function extendRetailProductGroups(base) {
  const groups = Object.fromEntries(Object.entries(base).map(([id, leaves]) => [id, [...leaves]]));
  for (const category of RETAIL_CATEGORY_ADDITIONS) {
    (groups[category.groupId] ||= []).push(category.id);
  }
  return Object.fromEntries(RETAIL_MAIN_CATEGORIES.map(group => [group.id, Object.freeze(groups[group.id])]));
}

export function extendRetailDiscoveryGroups(base) {
  const existing = new Map(base.map(group => [group.id, group]));
  const extraLeaves = id => RETAIL_CATEGORY_ADDITIONS.filter(category => category.groupId === id);
  const retail = RETAIL_MAIN_CATEGORIES.map(group => {
    const prior = existing.get(group.id);
    const extra = extraLeaves(group.id);
    return { ...prior, ...group, mode: 'buy', keywords: [...new Set([...(prior?.keywords || []), ...group.label.toLowerCase().split(/[^a-z]+/).filter(Boolean), ...extra.flatMap(category => category.keywords)])],
      categoryIds: [...(prior?.categoryIds || []), ...extra.map(category => category.id)] };
  });
  return [...retail, ...base.filter(group => !RETAIL_MAIN_CATEGORIES.some(retailGroup => retailGroup.id === group.id))];
}
