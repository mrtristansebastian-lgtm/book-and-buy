// Shared, dependency-free catalogue templates. Keep these IDs stable in saved listings.
// The discovery taxonomy supplies the menus; these templates supply the actual product setup.
const text = (key, label, extra = {}) => ({ key, label, ...extra });
const number = (key, label, unit = '', extra = {}) => ({ key, label, unit, type: 'number', min: 0, max: 100000000, ...extra });
const select = (key, label, options, extra = {}) => ({ key, label, options, ...extra });
const essential = { essential: true };
const common = [
  text('brand', 'Brand / maker', essential),
  text('colour', 'Colour / finish', essential),
  text('material', 'Material', essential),
  select('condition', 'Condition', ['New', 'Used', 'Vintage', 'Refurbished', 'Made to order']),
  text('countryOfOrigin', 'Country of origin'),
  text('warranty', 'Warranty details'),
  text('included', 'What is included', { multiline: true, maxLength: 1200 }),
  text('careInstructions', 'Care instructions', { multiline: true, maxLength: 1200 })
];
const dimensions = [
  text('dimensions', 'Dimensions', { hint: 'Include the units, for example 40 × 30 × 15 cm.' }),
  number('width', 'Width', 'cm', { max: 100000 }),
  number('height', 'Height', 'cm', { max: 100000 }),
  number('depth', 'Depth / length', 'cm', { max: 100000 }),
  number('weight', 'Weight', 'kg', { max: 100000 }),
  number('packQuantity', 'Items in pack', '', { integer: true, min: 1, max: 1000000 })
];
const group = (label, fields) => ({ label, fields });
const familyFields = {
  generic: [text('model', 'Model / range'), text('size', 'Size', essential), text('features', 'Features', { multiline: true, maxLength: 1200 })],
  apparel: [text('size', 'Size', essential), select('fit', 'Fit', ['Regular', 'Slim', 'Relaxed', 'Oversized', 'Fitted', 'Other'], essential), select('clothingSizeSystem', 'Clothing size system', ['Letter sizes (XS–XXL)', 'SA / UK', 'EU', 'US', 'Age-based', 'One size', 'Custom measurements']), text('fabricComposition', 'Fabric composition'), select('stretch', 'Fabric stretch', ['Non-stretch', 'Slight stretch', 'Stretch', 'Four-way stretch']), select('waistRise', 'Waist rise', ['Low rise', 'Mid rise', 'High rise']), text('waistMeasurement', 'Waist measurement', { hint: 'Include units, for example 76 cm.' }), text('chestMeasurement', 'Chest / bust measurement', { hint: 'Include units, for example 96 cm.' }), text('hipMeasurement', 'Hip measurement'), text('inseam', 'Inside leg length'), text('ageRange', 'Age range'), select('lining', 'Lining', ['Fully lined', 'Partially lined', 'Unlined']), select('opacity', 'Opacity', ['Opaque', 'Semi-sheer', 'Sheer']), text('garmentLength', 'Garment length'), text('sleeveLength', 'Sleeve length'), text('pattern', 'Pattern'), text('fastening', 'Fastening'), text('sizeGuide', 'Size guide', { multiline: true, maxLength: 1200 }), text('careLabel', 'Washing instructions', { multiline: true, maxLength: 600 })],
  footwear: [text('size', 'Shoe size', essential), select('sizeSystem', 'Size system', ['UK', 'EU', 'US', 'SA', 'Other'], essential), text('upperMaterial', 'Upper material'), text('soleMaterial', 'Sole material'), text('fastening', 'Fastening'), number('heelHeight', 'Heel height', 'cm', { max: 100 }), select('waterproof', 'Waterproof', ['Yes', 'No']), text('sizeGuide', 'Size guide', { multiline: true, maxLength: 1200 })],
  jewellery: [text('size', 'Size / length', essential), text('metal', 'Metal', essential), text('purity', 'Metal purity'), text('gemstone', 'Gemstone'), number('caratWeight', 'Stone carat weight', 'ct', { max: 10000 }), text('plating', 'Plating'), text('fastening', 'Clasp / fastening'), text('certificate', 'Certification details', { hint: 'Only describe certification supplied with this item.' })],
  watch: [text('model', 'Model', essential), select('movement', 'Movement', ['Quartz', 'Automatic', 'Manual wind', 'Solar', 'Other'], essential), text('caseMaterial', 'Case material'), number('caseDiameter', 'Case diameter', 'mm', { max: 200 }), text('strapMaterial', 'Strap material'), text('strapSize', 'Strap size'), text('waterResistance', 'Water resistance'), text('watchFunctions', 'Functions')],
  bag: [text('size', 'Size', essential), number('volume', 'Capacity', 'L', { max: 10000 }), text('fastening', 'Closure'), text('strapStyle', 'Strap / handle style'), text('compartments', 'Compartments'), text('compatibleSize', 'Fits devices / items up to')],
  art: [text('artist', 'Artist / creator', essential), text('medium', 'Medium', essential), text('artworkSize', 'Artwork size', essential), text('orientation', 'Orientation'), text('edition', 'Edition'), select('framed', 'Framing', ['Framed', 'Unframed', 'Frame optional']), select('signed', 'Signed', ['Yes', 'No']), number('creationYear', 'Year created', '', { integer: true, min: 1000, max: 2100 }), text('printSurface', 'Print surface'), text('provenance', 'Provenance', { multiline: true, maxLength: 1000 })],
  ceramic: [number('volume', 'Capacity', 'L', { max: 10000 }), text('finish', 'Glaze / finish', essential), select('dishwasherSafe', 'Dishwasher safe', ['Yes', 'No']), select('microwaveSafe', 'Microwave safe', ['Yes', 'No']), text('handmadeNotes', 'Handmade variation notes', { multiline: true, maxLength: 600 })],
  textile: [text('size', 'Size', essential), text('fabricComposition', 'Fabric composition'), text('pattern', 'Pattern'), text('weave', 'Weave / technique'), text('handmadeNotes', 'Handmade variation notes', { multiline: true, maxLength: 600 })],
  gift: [text('occasion', 'Occasion', essential), select('personalisation', 'Personalisation', ['Available', 'Not available']), text('personalisationDetails', 'Personalisation details', { multiline: true, maxLength: 800 }), text('giftPackaging', 'Gift packaging'), text('handmadeNotes', 'Handmade variation notes', { multiline: true, maxLength: 600 })],
  collectible: [text('maker', 'Maker / publisher', essential), text('era', 'Era / release', essential), text('edition', 'Edition'), text('collection', 'Collection / series'), text('conditionNotes', 'Condition notes', { essential: true, multiline: true, maxLength: 1000 }), text('provenance', 'Provenance', { multiline: true, maxLength: 1000 })],
  sports: [text('sport', 'Sport / activity', essential), text('size', 'Size', essential), text('model', 'Model / range'), text('skillLevel', 'Suitable experience level'), text('capacity', 'Capacity / rating'), text('features', 'Features', { multiline: true, maxLength: 1200 })],
  outdoor: [text('activity', 'Outdoor activity', essential), text('size', 'Size', essential), number('personCapacity', 'People capacity', '', { integer: true, min: 1, max: 1000 }), text('seasonRating', 'Season / temperature rating'), select('waterproof', 'Waterproof', ['Yes', 'No']), text('packSize', 'Packed size'), text('features', 'Features', { multiline: true, maxLength: 1200 })],
  book: [text('author', 'Author', essential), select('format', 'Format', ['Paperback', 'Hardcover', 'Board book', 'Spiral bound', 'Other'], essential), text('language', 'Language', essential), text('publisher', 'Publisher'), text('isbn', 'ISBN'), text('edition', 'Edition'), number('publicationYear', 'Publication year', '', { integer: true, min: 1000, max: 2100 }), number('pageCount', 'Pages', '', { integer: true, min: 1, max: 100000 }), text('genre', 'Genre / subject'), text('ageRange', 'Suggested age range')],
  stationery: [text('size', 'Paper / item size', essential), text('paperType', 'Paper type / finish'), number('paperWeight', 'Paper weight', 'gsm', { max: 5000 }), select('ruling', 'Page ruling', ['Blank', 'Lined', 'Dotted', 'Squared', 'Mixed', 'Other']), number('pageCount', 'Pages', '', { integer: true, min: 1, max: 100000 }), text('inkType', 'Ink type'), text('tipSize', 'Nib / tip size'), text('binding', 'Binding')],
  beauty: [text('productRange', 'Range / collection'), text('netContent', 'Net contents', essential), text('skinHairType', 'Suitable skin / hair type', essential), text('shade', 'Shade / scent'), text('ingredients', 'Ingredients', { multiline: true, maxLength: 1600 }), text('usageInstructions', 'How to use', { multiline: true, maxLength: 1200 }), text('warnings', 'Product warnings', { multiline: true, maxLength: 1200 }), text('shelfLife', 'Shelf life / period after opening'), text('storageInstructions', 'Storage instructions', { multiline: true, maxLength: 600 })],
  furniture: [text('furnitureSize', 'Size / dimensions', essential), number('seatingCapacity', 'Seating capacity', '', { integer: true, min: 1, max: 100 }), select('assembly', 'Assembly', ['Fully assembled', 'Assembly required', 'Part assembled']), text('upholstery', 'Upholstery'), text('finish', 'Finish'), text('loadCapacity', 'Maximum load'), text('deliveryNotes', 'Delivery / access notes', { multiline: true, maxLength: 800 })],
  soft: [text('size', 'Size', essential), text('fabricComposition', 'Fabric composition'), text('pattern', 'Pattern'), text('fill', 'Filling'), text('weave', 'Weave / thread count'), text('fastening', 'Closure')],
  decor: [text('size', 'Size', essential), text('finish', 'Finish'), text('style', 'Style'), text('scent', 'Scent'), number('burnTime', 'Stated burn time', 'h', { max: 100000 }), text('powerRequirements', 'Power requirements'), text('bulbType', 'Bulb / fitting type')],
  flowers: [text('flowerVarieties', 'Flower varieties', essential), text('bouquetSize', 'Bouquet / arrangement size', essential), text('occasion', 'Occasion'), text('vaseIncluded', 'Vase / container included'), text('seasonalSubstitutions', 'Seasonal substitutions', { multiline: true, maxLength: 800 }), text('deliveryNotes', 'Delivery notes', { multiline: true, maxLength: 800 })],
  plant: [text('plantName', 'Plant variety', essential), text('plantSize', 'Plant size', essential), text('potSize', 'Pot size'), select('plantPlacement', 'Placement', ['Indoor', 'Outdoor', 'Indoor or outdoor']), text('lightNeeds', 'Light needs'), text('watering', 'Watering'), select('petSafe', 'Pet safety information', ['Known pet-safe variety', 'Potentially toxic to pets', 'Unknown']), text('potIncluded', 'Pot / planter included')],
  pet: [text('animal', 'Suitable animal', essential), text('size', 'Size', essential), text('lifeStage', 'Life stage'), text('features', 'Features', { multiline: true, maxLength: 1200 }), text('compatibility', 'Compatibility / fit')],
  petFood: [text('animal', 'Suitable animal', essential), text('netContent', 'Net contents', essential), text('lifeStage', 'Life stage', essential), text('flavour', 'Flavour / recipe'), text('ingredients', 'Ingredients', { multiline: true, maxLength: 1600 }), text('nutrition', 'Nutritional information', { multiline: true, maxLength: 1200 }), text('feedingGuide', 'Feeding guide', { multiline: true, maxLength: 1200 }), text('storageInstructions', 'Storage instructions', { multiline: true, maxLength: 600 })],
  digital: [text('fileFormat', 'File format', essential), text('compatibility', 'Required software / compatibility', essential), text('licence', 'Usage licence', { essential: true, multiline: true, maxLength: 1000 }), text('assetCount', 'Files / assets included'), text('digitalDimensions', 'Dimensions / resolution'), text('version', 'Version'), text('language', 'Language'), text('features', 'Contents', { multiline: true, maxLength: 1200 })]
};

export const PRODUCT_CATEGORY_GROUPS = Object.freeze({
  buy_vehicles: ['vehicles_cars'], buy_equipment: ['equipment_machinery', 'equipment_construction', 'equipment_agricultural', 'equipment_workshop', 'equipment_generators', 'equipment_commercial', 'equipment_tools'],
  buy_fashion: ['fashion', 'fashion_womens', 'fashion_mens', 'fashion_kids', 'fashion_streetwear', 'fashion_footwear', 'fashion_accessories', 'clothing_tops', 'clothing_bottoms', 'clothing_dresses', 'clothing_outerwear', 'clothing_activewear', 'clothing_underwear', 'clothing_swimwear', 'clothing_baby', 'clothing_workwear', 'clothing_occasion'],
  buy_jewelry: ['jewelry', 'jewelry_fine', 'jewelry_fashion', 'jewelry_watches', 'jewelry_bags'],
  buy_art: ['art_prints', 'art_originals', 'art_print_editions', 'art_photo_prints'],
  buy_handmade: ['handmade', 'handmade_ceramics', 'handmade_textiles', 'handmade_gifts'],
  buy_vintage: ['vintage_thrift', 'vintage_clothing', 'vintage_home', 'vintage_collectibles'],
  buy_sports: ['sports_gear', 'sports_apparel', 'sports_equipment', 'sports_outdoor'],
  buy_books: ['books_stationery', 'books_reading', 'books_stationery_supplies', 'books_journals'],
  buy_electronics: ['electronics_acc', 'electronics_phone', 'electronics_audio', 'electronics_gifts', 'electronics_computers', 'electronics_displays', 'electronics_cameras', 'electronics_gaming', 'electronics_networking', 'electronics_components', 'electronics_smart_home', 'electronics_wearables'],
  buy_digital: ['digital_goods', 'digital_templates', 'digital_fonts', 'digital_courses'],
  buy_beauty: ['beauty_retail', 'beauty_skincare', 'beauty_makeup', 'beauty_haircare'],
  buy_home: ['home_decor', 'home_furniture', 'home_soft', 'home_accents', 'home_kitchenware'],
  buy_florists: ['florists_retail', 'florist_bouquets', 'florist_plants', 'florist_events'],
  buy_pets: ['pet_supplies', 'pet_food', 'pet_toys', 'pet_grooming_products']
});
const all = (...groups) => groups.flatMap(key => PRODUCT_CATEGORY_GROUPS[key]);
const templates = [];
function add(family, categoryIds, entries, extra = {}) {
  const deviceCategories = { Laptop: 'electronics_computers', Desktop: 'electronics_computers', Monitor: 'electronics_displays', TV: 'electronics_displays', Camera: 'electronics_cameras', Console: 'electronics_gaming', Networking: 'electronics_networking', Component: 'electronics_components', Storage: 'electronics_components', 'Smart home': 'electronics_smart_home' };
  for (const [id, label, entryExtra = {}] of entries) {
    const category = extra.listingType === 'electronics' ? deviceCategories[entryExtra.deviceType] : '';
    templates.push(Object.freeze({ id, label, family, listingType: 'physical', categoryIds: Object.freeze([...new Set([...categoryIds, ...(category ? [category] : [])])]), ...extra, ...entryExtra, ...(entryExtra.detailDefaults ? { detailDefaults: Object.freeze({ ...entryExtra.detailDefaults }) } : {}) }));
  }
}
add('apparel', [...all('buy_fashion'), 'vintage_thrift', 'vintage_clothing', 'sports_apparel'], [
  ['apparel_tshirt', 'T-shirt'], ['apparel_shirt', 'Shirt / blouse'], ['apparel_hoodie', 'Hoodie / sweatshirt'], ['apparel_jacket', 'Jacket / coat'], ['apparel_trousers', 'Trousers / jeans'], ['apparel_shorts', 'Shorts'], ['apparel_dress', 'Dress'], ['apparel_skirt', 'Skirt'], ['apparel_activewear', 'Activewear'], ['apparel_underwear', 'Underwear / swimwear'], ['apparel_hat', 'Hat / cap'], ['apparel_other', 'Other clothing']
]);
add('footwear', [...all('buy_fashion'), 'vintage_thrift', 'vintage_clothing', 'sports_apparel', 'sports_gear'], [
  ['footwear_sneakers', 'Sneakers / trainers'], ['footwear_boots', 'Boots'], ['footwear_sandals', 'Sandals'], ['footwear_heels', 'Heels'], ['footwear_shoes', 'Formal / everyday shoes'], ['footwear_sports', 'Sports shoes']
]);
add('jewellery', ['jewelry', 'jewelry_fine', 'jewelry_fashion', 'handmade', 'handmade_gifts', 'vintage_thrift', 'vintage_collectibles'], [
  ['jewellery_ring', 'Ring'], ['jewellery_necklace', 'Necklace / pendant'], ['jewellery_bracelet', 'Bracelet / bangle'], ['jewellery_earrings', 'Earrings'], ['jewellery_brooch', 'Brooch / charm']
]);
add('watch', ['jewelry', 'jewelry_watches', 'vintage_thrift', 'vintage_collectibles'], [['watch_wristwatch', 'Wristwatch']]);
add('bag', ['jewelry', 'jewelry_bags', ...all('buy_fashion'), 'sports_gear', 'sports_outdoor'], [['bag_handbag', 'Handbag'], ['bag_backpack', 'Backpack'], ['bag_wallet', 'Wallet / purse'], ['bag_luggage', 'Luggage / travel bag'], ['bag_tote', 'Tote / shoulder bag']]);
add('art', all('buy_art'), [['art_painting', 'Painting'], ['art_drawing', 'Drawing / illustration'], ['art_print', 'Art print'], ['art_photo', 'Photographic print'], ['art_sculpture', 'Sculpture']]);
add('ceramic', ['handmade', 'handmade_ceramics', 'home_decor', 'home_accents'], [['ceramic_mug', 'Mug / cup'], ['ceramic_bowl', 'Bowl / plate'], ['ceramic_vase', 'Vase'], ['ceramic_object', 'Ceramic object']]);
add('textile', ['handmade', 'handmade_textiles'], [['textile_woven', 'Woven textile'], ['textile_knitted', 'Knitted / crocheted item'], ['textile_fabric', 'Fabric / textile piece']]);
add('gift', ['handmade', 'handmade_gifts', 'home_accents'], [['gift_personalised', 'Personalised gift'], ['gift_set', 'Gift set'], ['gift_craft', 'Craft / decorative object']]);
add('collectible', ['vintage_thrift', 'vintage_collectibles'], [['collectible_toy', 'Collectible toy / figure'], ['collectible_record', 'Vinyl record / music'], ['collectible_object', 'Vintage collectible']]);
add('sports', ['sports_gear', 'sports_equipment'], [['sports_ball', 'Ball'], ['sports_racket', 'Racket / bat'], ['sports_weights', 'Weights / training gear'], ['sports_protection', 'Protective gear'], ['sports_bicycle', 'Bicycle'], ['sports_accessory', 'Sports accessory']]);
add('outdoor', ['sports_gear', 'sports_outdoor'], [['outdoor_tent', 'Tent / shelter'], ['outdoor_sleeping', 'Sleeping bag / mat'], ['outdoor_camping', 'Camping accessory'], ['outdoor_hiking', 'Hiking gear']]);
add('book', ['books_stationery', 'books_reading', 'vintage_thrift', 'vintage_collectibles'], [['book_fiction', 'Fiction book'], ['book_nonfiction', 'Non-fiction book'], ['book_children', 'Children’s book'], ['book_cookbook', 'Cookbook'], ['book_workbook', 'Workbook / learning book']]);
add('stationery', ['books_stationery', 'books_stationery_supplies', 'books_journals'], [['stationery_journal', 'Journal / notebook'], ['stationery_planner', 'Planner / diary'], ['stationery_pen', 'Pen / pencil'], ['stationery_paper', 'Paper / card'], ['stationery_greeting', 'Greeting card'], ['stationery_set', 'Stationery set']]);
add('beauty', ['beauty_retail', 'beauty_skincare'], [['beauty_cleanser', 'Cleanser / face wash'], ['beauty_moisturiser', 'Moisturiser'], ['beauty_serum', 'Cosmetic serum'], ['beauty_bodycare', 'Body care / bath product']]);
add('beauty', ['beauty_retail', 'beauty_makeup'], [['beauty_foundation', 'Foundation / concealer'], ['beauty_lips', 'Lip colour'], ['beauty_eyes', 'Eye makeup'], ['beauty_brush', 'Makeup brush / tool'], ['beauty_fragrance', 'Fragrance']]);
add('beauty', ['beauty_retail', 'beauty_haircare'], [['beauty_shampoo', 'Shampoo / conditioner'], ['beauty_styling', 'Hair styling product'], ['beauty_hairtool', 'Non-electrical hair accessory']]);
add('furniture', ['home_decor', 'home_furniture', 'vintage_thrift', 'vintage_home'], [['furniture_chair', 'Chair / stool'], ['furniture_sofa', 'Sofa / armchair'], ['furniture_table', 'Table / desk'], ['furniture_bed', 'Bed / headboard'], ['furniture_storage', 'Cabinet / shelving'], ['furniture_mattress', 'Mattress']]);
add('soft', ['home_decor', 'home_soft', 'handmade', 'handmade_textiles', 'vintage_home'], [['home_cushion', 'Cushion / cover'], ['home_bedding', 'Bedding'], ['home_blanket', 'Blanket / throw'], ['home_curtain', 'Curtain'], ['home_rug', 'Rug'], ['home_towel', 'Towel / linen']]);
add('decor', ['home_decor', 'home_accents', 'vintage_thrift', 'vintage_home'], [['decor_candle', 'Candle / diffuser'], ['decor_lamp', 'Lamp / light fitting'], ['decor_mirror', 'Mirror'], ['decor_clock', 'Clock'], ['decor_storage', 'Storage basket / organiser'], ['decor_kitchen', 'Kitchenware / utensil'], ['decor_object', 'Decorative object']]);
add('flowers', ['florists_retail', 'florist_bouquets', 'florist_events'], [['flowers_bouquet', 'Bouquet'], ['flowers_arrangement', 'Flower arrangement'], ['flowers_dried', 'Dried flowers'], ['flowers_event', 'Event floral arrangement']]);
add('plant', ['florists_retail', 'florist_plants'], [['plant_indoor', 'Indoor plant'], ['plant_outdoor', 'Outdoor plant'], ['plant_succulent', 'Succulent / cactus']]);
add('pet', ['pet_supplies', 'pet_toys'], [['pet_toy', 'Pet toy'], ['pet_bed', 'Pet bed'], ['pet_lead', 'Collar / lead / harness'], ['pet_bowl', 'Bowl / feeder'], ['pet_carrier', 'Pet carrier'], ['pet_accessory', 'Pet accessory']]);
add('pet', ['pet_supplies', 'pet_grooming_products'], [['pet_grooming', 'Pet grooming product'], ['pet_brush', 'Pet brush / grooming tool']]);
add('petFood', ['pet_supplies', 'pet_food'], [['pet_food', 'Pet food'], ['pet_treat', 'Pet treat']]);
add('digital', ['digital_goods', 'digital_templates'], [['digital_template', 'Editable template'], ['digital_art', 'Digital artwork'], ['digital_asset', 'Design asset pack']]);
add('digital', ['digital_goods', 'digital_fonts'], [['digital_font', 'Font / typeface']]);
add('digital', ['digital_goods', 'digital_courses'], [['digital_guide', 'Digital guide / workbook'], ['digital_course', 'Recorded course / learning material']]);

const electronicCategories = ['electronics_acc', 'electronics_gifts'];
add('electronics', [...electronicCategories, 'electronics_phone'], [['electronics_phone', 'Mobile phone', { deviceType: 'Phone' }], ['electronics_tablet', 'Tablet', { deviceType: 'Tablet' }]], { listingType: 'electronics' });
add('electronics', electronicCategories, [
  ['electronics_laptop', 'Laptop', { deviceType: 'Laptop' }], ['electronics_desktop', 'Desktop computer', { deviceType: 'Desktop' }], ['electronics_monitor', 'Monitor', { deviceType: 'Monitor' }], ['electronics_tv', 'Television', { deviceType: 'TV' }], ['electronics_console', 'Games console', { deviceType: 'Console' }],
  ['electronics_smartwatch', 'Smartwatch', { deviceType: 'Wearable', detailDefaults: { wearableType: 'Smartwatch' } }], ['electronics_tracker', 'Fitness tracker', { deviceType: 'Wearable', detailDefaults: { wearableType: 'Fitness tracker' } }],
  ['electronics_camera', 'Digital camera', { deviceType: 'Camera' }], ['electronics_action_camera', 'Action camera', { deviceType: 'Camera', detailDefaults: { cameraType: 'Action' } }],
  ['electronics_router', 'Router / modem', { deviceType: 'Networking' }], ['electronics_component', 'Computer component', { deviceType: 'Component' }], ['electronics_storage', 'Storage drive / memory card', { deviceType: 'Storage' }],
  ['electronics_keyboard', 'Keyboard', { deviceType: 'Accessory', detailDefaults: { accessoryType: 'Keyboard' } }], ['electronics_mouse', 'Mouse', { deviceType: 'Accessory', detailDefaults: { accessoryType: 'Mouse' } }], ['electronics_charger', 'Charger / power adapter', { deviceType: 'Accessory', detailDefaults: { accessoryType: 'Charger' } }], ['electronics_cable', 'Cable / adapter', { deviceType: 'Accessory' }], ['electronics_accessory', 'Device accessory', { deviceType: 'Accessory' }], ['electronics_smart_home', 'Smart home device', { deviceType: 'Smart home' }]
], { listingType: 'electronics' });
add('electronics', [...electronicCategories, 'electronics_audio'], [
  ['electronics_headphones', 'Headphones', { deviceType: 'Audio', detailDefaults: { audioType: 'Headphones' } }], ['electronics_earbuds', 'Earbuds', { deviceType: 'Audio', detailDefaults: { audioType: 'Earbuds' } }], ['electronics_speaker', 'Speaker', { deviceType: 'Audio', detailDefaults: { audioType: 'Speaker' } }], ['electronics_soundbar', 'Soundbar', { deviceType: 'Audio', detailDefaults: { audioType: 'Soundbar' } }], ['electronics_microphone', 'Microphone', { deviceType: 'Audio', detailDefaults: { audioType: 'Microphone' } }], ['electronics_audio', 'Audio equipment', { deviceType: 'Audio' }]
], { listingType: 'electronics' });
add('vehicle', ['vehicles_cars'], [['vehicle_car', 'Car'], ['vehicle_bakkie', 'Bakkie / pickup', { detailDefaults: { body: 'Bakkie' } }], ['vehicle_van', 'Van / minibus', { detailDefaults: { body: 'Van' } }], ['vehicle_suv', 'SUV', { detailDefaults: { body: 'SUV' } }]], { listingType: 'vehicle' });
add('equipment', ['equipment_machinery'], [
  ['equipment_construction', 'Construction machine', { detailDefaults: { equipmentType: 'Construction machinery' } }], ['equipment_agricultural', 'Agricultural machine', { detailDefaults: { equipmentType: 'Agricultural machinery' } }], ['equipment_workshop', 'Workshop / industrial machine', { detailDefaults: { equipmentType: 'Workshop / industrial machinery' } }], ['equipment_generator', 'Generator', { detailDefaults: { equipmentType: 'Generator' } }], ['equipment_commercial', 'Commercial equipment', { detailDefaults: { equipmentType: 'Commercial equipment' } }], ['equipment_tool', 'Specialist tool', { detailDefaults: { equipmentType: 'Specialist tool' } }]
], { listingType: 'equipment' });

export const PRODUCT_TEMPLATES = Object.freeze(templates);
// New products choose only a category and subcategory. These internal setups keep
// that classification useful without asking the seller to name an exact item type.
// Original template IDs stay supported so existing listings retain their details.
const categorySetups = {
  vehicles_cars: ['Cars & dealerships', 'vehicle', { listingType: 'vehicle' }],
  equipment_machinery: ['Equipment & machinery', 'equipment', { listingType: 'equipment' }],
  equipment_construction: ['Construction machinery', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_construction', detailDefaults: { equipmentType: 'Construction machinery' } }],
  equipment_agricultural: ['Agricultural machinery', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_agricultural', detailDefaults: { equipmentType: 'Agricultural machinery' } }],
  equipment_workshop: ['Workshop & industrial machinery', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_workshop', detailDefaults: { equipmentType: 'Workshop / industrial machinery' } }],
  equipment_generators: ['Generators', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_generator', detailDefaults: { equipmentType: 'Generator' } }],
  equipment_commercial: ['Commercial equipment', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_commercial', detailDefaults: { equipmentType: 'Commercial equipment' } }],
  equipment_tools: ['Specialist tools', 'equipment', { listingType: 'equipment', schemaTemplateId: 'equipment_tool', detailDefaults: { equipmentType: 'Specialist tool' } }],
  clothing_tops: ['Tops, T-shirts & shirts', 'apparel'],
  clothing_bottoms: ['Trousers, jeans & shorts', 'apparel'],
  clothing_dresses: ['Dresses & skirts', 'apparel'],
  clothing_outerwear: ['Jackets, coats & knitwear', 'apparel'],
  clothing_activewear: ['Activewear & sportswear', 'apparel'],
  clothing_underwear: ['Underwear & sleepwear', 'apparel'],
  clothing_swimwear: ['Swimwear', 'apparel'],
  clothing_baby: ['Baby & toddler clothing', 'apparel'],
  clothing_workwear: ['Workwear & uniforms', 'apparel'],
  clothing_occasion: ['Formal & occasion wear', 'apparel'],
  fashion: ['Fashion & apparel', 'generic', { families: ['apparel', 'footwear', 'bag'] }],
  fashion_womens: ['Women’s fashion', 'apparel'], fashion_mens: ['Men’s fashion', 'apparel'], fashion_kids: ['Kids’ fashion', 'apparel'], fashion_streetwear: ['Streetwear', 'apparel'],
  fashion_footwear: ['Footwear', 'footwear'], fashion_accessories: ['Fashion accessories', 'generic', { families: ['bag', 'apparel'] }],
  jewelry: ['Jewelry & accessories', 'jewellery', { families: ['jewellery', 'watch', 'bag'] }], jewelry_fine: ['Fine jewelry', 'jewellery'], jewelry_fashion: ['Fashion jewelry', 'jewellery'], jewelry_watches: ['Watches', 'watch'], jewelry_bags: ['Bags & wallets', 'bag'],
  art_prints: ['Art & prints', 'art'], art_originals: ['Original art', 'art'], art_print_editions: ['Print editions', 'art'], art_photo_prints: ['Photo prints', 'art'],
  handmade: ['Handmade & craft goods', 'generic', { families: ['ceramic', 'textile', 'gift'] }], handmade_ceramics: ['Ceramics', 'ceramic'], handmade_textiles: ['Textiles', 'textile'], handmade_gifts: ['Handmade gifts', 'gift'],
  vintage_thrift: ['Vintage & thrift', 'generic', { families: ['apparel', 'furniture', 'collectible'] }], vintage_clothing: ['Vintage clothing', 'apparel'], vintage_home: ['Vintage home', 'decor', { families: ['decor', 'furniture', 'soft'] }], vintage_collectibles: ['Collectibles', 'collectible'],
  sports_gear: ['Sports & outdoor gear', 'sports', { families: ['sports', 'outdoor'] }], sports_apparel: ['Sports apparel', 'apparel'], sports_equipment: ['Sports equipment', 'sports'], sports_outdoor: ['Outdoor gear', 'outdoor'],
  books_stationery: ['Books & stationery', 'generic', { families: ['book', 'stationery'] }], books_reading: ['Books', 'book'], books_stationery_supplies: ['Stationery', 'stationery'], books_journals: ['Journals & planners', 'stationery'],
  electronics_acc: ['Electronics & accessories', 'electronics', { listingType: 'electronics' }],
  electronics_phone: ['Phones & tablets', 'electronics', { listingType: 'electronics', allowedDeviceTypes: ['Phone', 'Tablet'] }],
  electronics_computers: ['Computers & laptops', 'electronics', { listingType: 'electronics', allowedDeviceTypes: ['Laptop', 'Desktop'] }],
  electronics_displays: ['TVs & monitors', 'electronics', { listingType: 'electronics', allowedDeviceTypes: ['TV', 'Monitor'] }],
  electronics_cameras: ['Cameras & photography', 'electronics', { listingType: 'electronics', deviceType: 'Camera' }],
  electronics_gaming: ['Gaming & consoles', 'electronics', { listingType: 'electronics', allowedDeviceTypes: ['Console', 'Accessory', 'Component'] }],
  electronics_networking: ['Networking', 'electronics', { listingType: 'electronics', deviceType: 'Networking' }],
  electronics_components: ['Components & storage', 'electronics', { listingType: 'electronics', allowedDeviceTypes: ['Component', 'Storage'] }],
  electronics_smart_home: ['Smart home', 'electronics', { listingType: 'electronics', deviceType: 'Smart home' }],
  electronics_audio: ['Audio', 'electronics', { listingType: 'electronics', deviceType: 'Audio' }],
  electronics_wearables: ['Wearable technology', 'electronics', { listingType: 'electronics', deviceType: 'Wearable' }],
  electronics_gifts: ['Tech gifts', 'electronics', { listingType: 'electronics' }],
  digital_goods: ['Digital downloads & creative assets', 'digital'], digital_templates: ['Templates', 'digital'], digital_fonts: ['Fonts & graphics', 'digital'], digital_courses: ['Digital guides & courses', 'digital'],
  beauty_retail: ['Beauty & cosmetics retail', 'beauty'], beauty_skincare: ['Skincare', 'beauty'], beauty_makeup: ['Makeup', 'beauty'], beauty_haircare: ['Haircare', 'beauty'],
  home_decor: ['Home decor', 'generic', { families: ['furniture', 'soft', 'decor', 'ceramic'] }], home_furniture: ['Furniture', 'furniture'], home_soft: ['Soft furnishings', 'soft'], home_accents: ['Home accents', 'decor'], home_kitchenware: ['Kitchenware & utensils', 'generic', { families: ['ceramic', 'decor'] }],
  florists_retail: ['Flowers & plants', 'generic', { families: ['flowers', 'plant'] }], florist_bouquets: ['Bouquets', 'flowers'], florist_plants: ['Plants', 'plant'], florist_events: ['Event flowers', 'flowers'],
  pet_supplies: ['Pet supplies', 'pet', { families: ['pet', 'petFood'] }], pet_food: ['Pet food & treats', 'petFood'], pet_toys: ['Pet toys', 'pet'], pet_grooming_products: ['Pet grooming products', 'pet']
};
export const PRODUCT_CATEGORY_TEMPLATES = Object.freeze(Object.entries(PRODUCT_CATEGORY_GROUPS).flatMap(([mainCategoryId, ids]) => ids.map(categoryId => {
  const [label, family, extra = {}] = categorySetups[categoryId];
  return Object.freeze({ id: `category_${categoryId}`, label, family, listingType: 'physical', mainCategoryId, categoryIds: Object.freeze([categoryId]), categorySetup: true, ...extra });
})));
const categoryById = new Map(PRODUCT_CATEGORY_TEMPLATES.map(template => [template.categoryIds[0], template]));
export const getProductCategoryTemplate = subcategoryId => typeof subcategoryId === 'string' ? categoryById.get(subcategoryId.trim()) || null : null;
const byId = new Map([...PRODUCT_TEMPLATES, ...PRODUCT_CATEGORY_TEMPLATES].map(template => [template.id, template]));
export const getProductTemplate = id => typeof id === 'string' ? byId.get(id.trim()) || null : null;
export const getProductTemplates = subcategoryId => {
  if (typeof subcategoryId !== 'string') return [];
  const existing = PRODUCT_TEMPLATES.filter(template => template.categoryIds.includes(subcategoryId.trim()));
  return existing.length ? existing : [getProductCategoryTemplate(subcategoryId)].filter(Boolean);
};

// Subtypes share the device schema but should not offer unrelated extra fields.
// Unlisted fields remain available: these exclusions only remove known mismatches.
export function productTemplateAllowsField(product = {}, field = {}) {
  const template = getProductTemplate(product.catalogTemplateId);
  if (!template) return true;
  const accessoryType = template.detailDefaults?.accessoryType;
  const onlyAccessory = {
    keyboardLayout: ['Keyboard'], keyboardSwitches: ['Keyboard'],
    mouseSensitivity: ['Mouse'], buttonCount: ['Mouse', 'Keyboard'],
    lensMount: ['Lens'], focalLength: ['Lens'], aperture: ['Lens']
  }[field.key];
  if (template.deviceType === 'Accessory' && accessoryType && onlyAccessory && !onlyAccessory.includes(accessoryType)) return false;
  if (template.deviceType === 'Audio') {
    const audioType = template.detailDefaults?.audioType;
    if (['Headphones', 'Earbuds', 'Microphone'].includes(audioType) && ['speakerConfiguration', 'audioPower'].includes(field.key)) return false;
    if (['Speaker', 'Soundbar', 'Microphone'].includes(audioType) && field.key === 'noiseCancellation') return false;
    if (audioType === 'Microphone' && ['driverSize', 'microphone'].includes(field.key)) return false;
  }
  return true;
}

const uniqueFields = fields => [...new Map(fields.map(field => [field.key, field])).values()];
// The full physical allowlist retains approved owner-entered extras after a template switch.
export const PHYSICAL_SCHEMA = Object.freeze([
  group('Product basics', common),
  group('Product details', uniqueFields(Object.values(familyFields).flat())),
  group('Dimensions & packaging', dimensions)
]);
export function productTemplateSchema(product = {}) {
  const template = getProductTemplate(product.catalogTemplateId);
  const family = template?.listingType === 'physical' ? template.family : 'generic';
  const hiddenClothingFields = { clothing_tops: ['waistRise', 'inseam'], clothing_bottoms: ['sleeveLength', 'chestMeasurement'], clothing_dresses: ['waistRise', 'inseam'], clothing_outerwear: ['waistRise', 'inseam'], clothing_underwear: ['waistRise', 'inseam'], clothing_swimwear: ['waistRise', 'inseam', 'sleeveLength'] }[template?.categoryIds?.[0]] || [];
  const primaryFields = (familyFields[family] || familyFields.generic).filter(field => !hiddenClothingFields.includes(field.key));
  const primaryKeys = new Set(primaryFields.map(field => field.key));
  const extras = (template?.families || []).filter(item => item !== family).flatMap(item =>
    (familyFields[item] || []).filter(field => !primaryKeys.has(field.key)).map(field => ({ ...field, essential: false }))
  );
  const fields = [...primaryFields, ...uniqueFields(extras)];
  const skipCommon = ['book', 'digital', 'flowers', 'plant'].includes(family);
  const basics = skipCommon ? common.filter(field => ['brand', 'condition', 'included', 'careInstructions'].includes(field.key)).map(field => ({ ...field, essential: false })) : common;
  return [group('Product basics', basics), group(template ? `${template.label} details` : 'Product details', fields), group('Dimensions & packaging', dimensions)];
}
export function productTemplateFacts(product = {}, details = {}) {
  const family = getProductTemplate(product.catalogTemplateId)?.family || 'generic';
  const keys = {
    apparel: ['size', 'fit', 'material'], footwear: ['size', 'sizeSystem', 'upperMaterial'], jewellery: ['metal', 'gemstone', 'size'], watch: ['movement', 'caseDiameter', 'condition'], bag: ['material', 'size', 'volume'], art: ['artist', 'medium', 'artworkSize'], ceramic: ['material', 'finish', 'volume'], textile: ['material', 'size', 'pattern'], gift: ['occasion', 'material'], collectible: ['era', 'condition', 'edition'], sports: ['sport', 'size', 'material'], outdoor: ['activity', 'personCapacity', 'seasonRating'], book: ['author', 'format', 'language'], stationery: ['size', 'ruling', 'pageCount'], beauty: ['netContent', 'shade', 'skinHairType'], furniture: ['material', 'furnitureSize', 'seatingCapacity'], soft: ['size', 'material', 'pattern'], decor: ['material', 'size', 'scent'], flowers: ['flowerVarieties', 'bouquetSize'], plant: ['plantName', 'plantSize', 'plantPlacement'], pet: ['animal', 'size', 'lifeStage'], petFood: ['animal', 'netContent', 'lifeStage'], digital: ['fileFormat', 'compatibility'], generic: ['brand', 'size', 'material']
  }[family] || ['brand', 'size', 'material'];
  return keys.flatMap(key => {
    const value = details[key];
    if (!value) return [];
    if (key === 'caseDiameter') return [`${value} mm`];
    if (key === 'volume') return [`${value} L`];
    if (key === 'pageCount') return [`${value} pages`];
    if (key === 'seatingCapacity') return [`${value} seats`];
    if (key === 'personCapacity') return [`${value} people`];
    return [String(value)];
  }).slice(0, 3);
}
