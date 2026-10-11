import { getProductCategoryTemplate } from '../../functions/catalogTemplates.js';
import { getApplicableListingSchema, listingDetailsKey, listingFacts, normalizeListing } from '../../functions/listingTypes.js';
import { RETAIL_MAIN_CATEGORIES } from '../../functions/retailCategories.js';
import { RETAIL_DEMO_PRODUCTS } from './demoRetailProducts.js';

const MEDIA_ROOT = '/example/book-and-buy-showcase/products';
const LOCATION = 'Example Central, Cape Town, South Africa';
const PARENTS = Object.fromEntries(RETAIL_MAIN_CATEGORIES.map(group => [group.id, group.label]));
const item = (leaf, name, price, specifications, subject, extra = {}) => ({ leaf, name, price, specifications, subject, ...extra });

// Each row represents a different object, not another copy of a neighbouring category.
// All merchandise, makers, model codes and supplied specifications are fictional demo examples.
const ROWS = [
  ...RETAIL_DEMO_PRODUCTS,
  item('vehicles_cars', '2022 Cityline 1.2 Hatchback', 185000,
    { make: 'Showcase Motors', model: 'Cityline', derivative: '1.2 Comfort', year: 2022, condition: 'Used', mileage: 42000, transmission: 'Automatic', fuel: 'Petrol', body: 'Hatchback', colour: 'Silver', location: LOCATION, engineCapacity: 1.2, seats: 5, doors: 5, serviceHistory: 'Full', comfortFeatures: 'Cloth seats, air conditioning, parking sensors' },
    'One silver compact five-door hatchback, fictional unbranded design, modest alloy wheels, charcoal cloth interior, three-quarter front view with the entire car visible.'),

  item('equipment_tools', 'RailCut 165 Track Saw', 3900,
    { brand: 'Showcase Tools', model: 'RailCut 165', material: 'Aluminium and reinforced plastic', colour: 'Teal / Black', condition: 'New', size: '165 mm blade', features: '1400 W · 230 V · 55 mm cutting depth', included: 'One 1.4 m guide rail' },
    'One teal and black electric plunge track saw with enclosed 165 mm circular blade housing and one aluminium guide rail, power cable neatly coiled; no extra tools.'),

  item('fashion', 'Foldaway Weekend Poncho', 490, { size: 'One size', material: 'Recycled polyester', colour: 'Olive', features: 'Packs into its front pocket', waterproof: 'No' }, 'One olive lightweight hooded poncho laid out neatly, front storage pocket and press-stud sides, no person.'),
  item('fashion_womens', 'Aya Wrap Blouse', 420, { size: 'XS–XL', fit: 'Regular', material: 'Viscose', colour: 'Terracotta', fastening: 'Side tie', sleeveLength: 'Three-quarter' }, 'One terracotta viscose wrap blouse with side tie and three-quarter sleeves, neatly arranged on an invisible form.'),
  item('fashion_mens', 'Everyday Linen Button-Down', 540, { size: 'S–XXL', fit: 'Relaxed', material: 'Linen blend', colour: 'Cream', fabricComposition: '55% linen, 45% cotton', fastening: 'Buttons' }, 'One cream long-sleeved linen-blend button-down shirt, relaxed fit, subtle woven texture, no logo.'),
  item('fashion_kids', 'Little Explorer Dungarees', 320, { size: '2–6 years', fit: 'Regular', material: 'Cotton', colour: 'Mustard', ageRange: '2–6 years', fastening: 'Shoulder buttons' }, 'One pair of mustard cotton children’s dungarees with bib pocket, button shoulder straps and rolled cuffs.'),
  item('fashion_streetwear', 'Block Print Oversized Hoodie', 650, { size: 'XS–XL', fit: 'Oversized', material: 'Cotton fleece', colour: 'Charcoal', pattern: 'Cream geometric block graphic', fastening: 'Pullover' }, 'One charcoal oversized hoodie, cream abstract geometric block graphic with no letters, hood and kangaroo pocket.'),
  item('fashion_footwear', 'Metro Leather Trainers', 890, { size: '4–10', sizeSystem: 'UK', material: 'Leather and rubber', colour: 'White', upperMaterial: 'Leather', soleMaterial: 'Rubber', fastening: 'Laces' }, 'One matching pair of clean white leather low-top trainers, plain white rubber soles, white laces, no logo.'),
  item('fashion_accessories', 'Sunline Woven Visor', 240, { size: 'Adjustable', material: 'Raffia and cotton', colour: 'Natural', fastening: 'Adjustable cotton strap' }, 'One natural raffia woven sun visor with open crown, curved brim and cream adjustable cotton rear strap.'),
  item('clothing_tops', 'Ribbed Cotton Crew Tee', 180, { size: 'XS / S / M / L', fit: 'Fitted', material: 'Cotton', colour: 'Natural / Ink', sleeveLength: 'Short', clothingSizeSystem: 'Letter sizes (XS–XXL)', careLabel: 'Machine wash at 30°C' }, 'One natural ivory fitted ribbed cotton crew-neck T-shirt, short sleeves, clean front and visible fine rib texture.', { variantPreset: 'tee', compareAtPrice: 220, weight: 180, length: 28, width: 22, height: 3 }),
  item('clothing_bottoms', 'Harbour Straight-Leg Jeans', 690, { size: 'SA / UK 28–38', fit: 'Regular', material: 'Cotton denim', colour: 'Indigo', clothingSizeSystem: 'SA / UK', waistRise: 'High rise', inseam: '76 cm', fastening: 'Button and zip' }, 'One pair of indigo straight-leg denim jeans, high waist, five pockets, copper-coloured rivets, no branding.'),
  item('clothing_dresses', 'Meadow Midi Skirt', 480, { size: 'XS–XL', fit: 'Regular', material: 'Viscose', colour: 'Sage', garmentLength: '80 cm', lining: 'Partially lined', pattern: 'Small cream botanical print' }, 'One sage green midi skirt with tiny cream botanical print, flowing hem and concealed side zip.'),
  item('clothing_outerwear', 'Coastal Wool Car Coat', 1450, { size: 'S–XL', fit: 'Relaxed', material: 'Wool blend', colour: 'Camel', lining: 'Fully lined', garmentLength: 'Knee length', fastening: 'Buttons' }, 'One camel knee-length wool-blend coat with notched lapels, three front buttons and two welt pockets.'),
  item('clothing_activewear', 'Motion High-Rise Leggings', 460, { size: 'S / M / L', fit: 'Fitted', material: 'Nylon and elastane', colour: 'Black / Moss', stretch: 'Four-way stretch', waistRise: 'High rise', garmentLength: 'Full length / Cropped' }, 'One pair of matte black high-rise full-length leggings, wide waistband and clean seams, no logo.', { variantPreset: 'leggings' }),
  item('clothing_underwear', 'Moonlight Cotton Pyjama Set', 560, { size: 'S–XL', fit: 'Relaxed', material: 'Cotton', colour: 'Dusty blue', garmentLength: 'Full length', fastening: 'Buttons', pattern: 'Fine white stripe' }, 'One coordinated dusty blue cotton pyjama set, button-front long-sleeve shirt and full-length trousers with fine white stripes, both pieces visible.'),
  item('clothing_swimwear', 'Reef One-Piece Swimsuit', 590, { size: 'XS–XL', fit: 'Fitted', material: 'Recycled polyester and elastane', colour: 'Deep teal', lining: 'Fully lined', stretch: 'Stretch' }, 'One deep teal one-piece swimsuit, scoop neckline, wide straps and clean athletic silhouette, no person.'),
  item('clothing_baby', 'Tiny Days Organic Babygrow', 260, { size: '0–12 months', fit: 'Regular', material: 'Organic cotton', colour: 'Cream', ageRange: '0–12 months', fastening: 'Press studs', pattern: 'Tiny sage leaf print' }, 'One cream cotton long-sleeved baby bodysuit with tiny sage leaf print and three crotch press studs.'),
  item('clothing_workwear', 'Studio Crossback Apron', 420, { size: 'One size', fit: 'Relaxed', material: 'Cotton canvas', colour: 'Natural', fastening: 'Crossback straps', careLabel: 'Machine wash at 30°C' }, 'One natural cream cotton canvas apron with crossback shoulder straps and a large divided front pocket, no model.'),
  item('clothing_occasion', 'Evening Satin Jumpsuit', 1250, { size: 'XS–XL', fit: 'Fitted', material: 'Satin', colour: 'Midnight navy', opacity: 'Opaque', lining: 'Partially lined', fastening: 'Concealed zip', garmentLength: 'Full length' }, 'One midnight navy satin evening jumpsuit with sleeveless fitted bodice and wide full-length trouser legs.'),

  item('jewelry', 'Silver Halo Cuff', 650, { size: 'Adjustable', metal: 'Sterling silver', purity: '925', material: 'Sterling silver', colour: 'Silver', fastening: 'Open cuff' }, 'One simple polished sterling silver open cuff bracelet, rounded band, no stones or engraving.'),
  item('jewelry_fine', 'Amara Gold Solitaire Ring', 3200, { size: 'J–R', metal: 'Gold', purity: '9ct', gemstone: 'Lab-grown sapphire', caratWeight: 0.5, material: '9ct gold and sapphire', colour: 'Gold / Blue' }, 'One yellow gold solitaire ring with one small round blue sapphire in a four-prong setting, slim plain band.'),
  item('jewelry_fashion', 'Colour Pop Resin Hoop Earrings', 190, { size: '35 mm', metal: 'Stainless steel', material: 'Resin and stainless steel', colour: 'Coral', fastening: 'Hinged hoops' }, 'One matching pair of coral translucent resin hoop earrings, 35 mm diameter, discreet stainless steel hinges.'),
  item('jewelry_watches', 'Meridian Automatic Field Watch', 1890, { model: 'Meridian 40', movement: 'Automatic', caseDiameter: 40, caseMaterial: 'Stainless steel', strapMaterial: 'Leather', strapSize: '20 mm', waterResistance: '50 m', material: 'Stainless steel and leather', colour: 'Black / Silver' }, 'One unbranded field wristwatch, brushed silver 40 mm round case, black dial with simple numerals and brown leather strap, no logo text.'),
  item('jewelry_bags', 'City Carry Leather Satchel', 650, { size: 'Mini / Standard', material: 'Leather', colour: 'Tan', volume: 5, fastening: 'Zip', strapStyle: 'Adjustable shoulder strap', compartments: 'Main compartment and inner pocket' }, 'One tan leather standard-size shoulder satchel, approximately 30 × 22 × 8 cm, zipped top and adjustable strap.', { variantPreset: 'satchel', weight: 650, length: 32, width: 24, height: 10 }),

  item('art_prints', 'Sea Breeze Botanical Drawing', 280, { artist: 'Lina Salo', medium: 'Ink', artworkSize: 'A4', orientation: 'Portrait', framed: 'Unframed', signed: 'Yes', creationYear: 2025, material: 'Paper and ink', colour: 'Black / Cream' }, 'One unframed A4 botanical ink drawing on cream paper, delicate coastal grass stems, no signature lettering, shown as a single physical sheet.'),
  item('art_originals', 'After the Rain — Original Acrylic', 4200, { artist: 'Sipho Duma', medium: 'Acrylic on canvas', artworkSize: '60 × 80 cm', orientation: 'Landscape', edition: 'Unique original', signed: 'Yes', creationYear: 2025, material: 'Canvas and acrylic paint', colour: 'Blue / Ochre' }, 'One unframed landscape acrylic canvas painting, 60 × 80 cm, expressive blue rain clouds above ochre fields, visible paint texture.'),
  item('art_print_editions', 'Night Harbour Screenprint 12/50', 750, { artist: 'Amina Nuru', medium: 'Screenprint', artworkSize: 'A3', orientation: 'Landscape', edition: '12/50', signed: 'Yes', printSurface: 'Cotton paper', material: 'Cotton paper and ink', colour: 'Navy / Terracotta' }, 'One unframed A3 screenprint on cotton paper, stylised navy harbour buildings and terracotta boats, crisp two-colour shapes, no text.'),
  item('art_photo_prints', 'Atlantic Morning Photographic Print', 690, { artist: 'Ben Naidoo', medium: 'Photographic print', artworkSize: '40 × 60 cm', orientation: 'Landscape', framed: 'Frame optional', printSurface: 'Matte photographic paper', material: 'Photographic paper', colour: 'Blue / Sand' }, 'One landscape-format matte photographic print, calm Atlantic waves at dawn and sandy coastline, 40 × 60 cm physical print, no frame.'),

  item('handmade', 'Reclaimed Oak Desk Organiser', 590, { size: '22 × 12 × 8 cm', material: 'Reclaimed oak', colour: 'Natural oak', condition: 'Made to order', features: 'Three compartments, hand-finished edges', careInstructions: 'Wipe with a soft dry cloth' }, 'One reclaimed oak desktop organiser, 22 × 12 × 8 cm, three empty compartments and softly rounded edges, no stationery inside.'),
  item('handmade_ceramics', 'Speckled Stoneware Pouring Jug', 380, { material: 'Stoneware', colour: 'Cream', finish: 'Speckled satin glaze', volume: 1, dishwasherSafe: 'Yes', microwaveSafe: 'Yes', handmadeNotes: 'Small differences in glaze and form are part of the handmade finish' }, 'One cream speckled stoneware pouring jug, one-litre capacity, satin glaze, rounded handle and small spout; empty.'),
  item('handmade_textiles', 'Handwoven Cotton Wall Hanging', 780, { material: 'Cotton', colour: 'Natural / Terracotta', size: '60 × 90 cm', pattern: 'Geometric', weave: 'Handloom', fabricComposition: '100% cotton' }, 'One 60 × 90 cm handwoven cotton wall hanging with terracotta geometric blocks, cream fringed bottom and simple wooden dowel.'),
  item('handmade_gifts', 'Engraved Keepsake Music Box', 890, { occasion: 'Anniversary', material: 'Walnut', colour: 'Warm brown', condition: 'Made to order', personalisation: 'Available', personalisationDetails: 'Name engraving up to 20 characters, arranged after enquiry', giftPackaging: 'Recyclable presentation box' }, 'One small walnut keepsake music box, closed hinged lid, plain blank engraving area and delicate brass winding key; no written name.', { stockAvailable: '', stockLabel: 'Made to order' }),

  item('vintage_thrift', '1980s Brass Letter Holder', 340, { size: '18 × 12 cm', material: 'Brass', colour: 'Aged brass', condition: 'Vintage', era: '1980s', maker: 'Unbranded', conditionNotes: 'Natural patina and light surface marks' }, 'One 1980s-style brass desktop letter holder with three curved dividers, warm aged patina and light surface marks; no letters.'),
  item('vintage_clothing', '1990s Denim Trucker Jacket', 650, { size: 'L', fit: 'Regular', material: 'Cotton denim', colour: 'Faded blue', condition: 'Vintage', fastening: 'Buttons', lining: 'Unlined' }, 'One faded blue vintage denim trucker jacket, metal buttons, two chest pockets and natural worn edges, no patches or labels.'),
  item('vintage_home', 'Mid-Century Teak Sideboard', 6800, { size: '180 × 45 × 75 cm', material: 'Teak', colour: 'Warm teak', condition: 'Vintage', furnitureSize: '180 × 45 × 75 cm', assembly: 'Fully assembled', finish: 'Oiled', style: 'Mid-century' }, 'One mid-century teak sideboard, 180 cm long, three drawers beside two sliding cupboard doors, tapered legs and warm oiled wood grain.'),
  item('vintage_collectibles', '1965 Die-Cast Roadster', 480, { maker: 'Fictional Modelcraft', era: '1965', edition: 'Original release', collection: 'Road Classics', conditionNotes: 'Small paint chips; original box is not included', condition: 'Vintage', material: 'Die-cast metal', colour: 'Red' }, 'One small red 1960s-style die-cast toy roadster, open top and cream miniature seats, a few paint chips, no box or real car badges.'),

  item('sports_gear', 'Cork Balance Board', 720, { sport: 'Balance training', size: '70 × 30 cm', material: 'Cork and birch', colour: 'Natural', skillLevel: 'Beginner', capacity: '120 kg' }, 'One oval birch balance board with cork grip surface and one separate cylindrical cork roller, no person.'),
  item('sports_apparel', 'Trail Run Reflective Windbreaker', 690, { size: 'XS–XL', fit: 'Regular', material: 'Recycled nylon', colour: 'Moss green', lining: 'Unlined', fastening: 'Zip', pattern: 'Solid with reflective trims' }, 'One moss green lightweight hooded running windbreaker with narrow silver reflective trim, zipped front and plain chest.'),
  item('sports_equipment', 'MatchPoint Carbon Padel Racket', 1450, { sport: 'Padel', size: 'Adult', material: 'Carbon fibre', colour: 'Black / Teal', skillLevel: 'Intermediate', model: 'MatchPoint Carbon' }, 'One black carbon-fibre padel racket, round perforated face, subtle teal edging, wrapped black handle and wrist cord, no brand logo.'),
  item('sports_outdoor', 'Summit Two-Person Tent', 1850, { activity: 'Camping', size: '210 × 130 × 110 cm', material: 'Polyester and aluminium', colour: 'Forest green', personCapacity: 2, seasonRating: 'Three-season', waterproof: 'Yes', packSize: '50 × 18 cm' }, 'One forest green two-person dome tent fully pitched, mesh inner doorway visible, compact vestibule and two crossing poles; no campsite props.'),

  item('books_stationery', 'Ocean Life Learning Workbook', 160, { size: 'A4', material: 'Paper', colour: 'Ocean blue', author: 'Tumi West', format: 'Paperback', language: 'English', pageCount: 64, genre: 'Children’s learning', ageRange: '6–9 years' }, 'One A4 paperback learning workbook with ocean-blue cover, friendly whale and sea turtle illustrations, readable title Ocean Life, no publisher logo.'),
  item('books_reading', 'The Lighthouse Letters', 240, { author: 'Nadia Brooks', format: 'Paperback', language: 'English', pageCount: 280, publicationYear: 2024, genre: 'Contemporary fiction', material: 'Paper', colour: 'Navy' }, 'One paperback novel with a navy and cream lighthouse cover, readable title The Lighthouse Letters, simple tasteful typography, no publisher logo.'),
  item('books_stationery_supplies', 'Precision Fineliner Drawing Set', 190, { size: 'Six pens', material: 'Plastic and ink', colour: 'Black', inkType: 'Water-based', tipSize: '0.1–0.8 mm', packQuantity: 6 }, 'Exactly six plain black fineliner pens, aligned side by side, different fine nib widths, one neat cream paper sleeve, no branding.'),
  item('books_journals', 'Undated Weekly Focus Planner', 220, { size: 'A5', material: 'Paper and metal spiral', colour: 'Sage', ruling: 'Mixed', pageCount: 160, binding: 'Spiral bound', paperWeight: 100 }, 'One sage A5 spiral-bound undated planner, plain cover and an open weekly spread with clean blank grids; no handwritten entries.'),

  item('electronics_acc', 'PocketPrint Thermal Label Printer', 690, { deviceType: 'Other', brand: 'Unbranded', model: 'LP1', condition: 'New', colour: 'Cream', features: 'Bluetooth thermal label printing; 203 dpi; rechargeable battery', material: 'ABS plastic', width: 110, height: 85, depth: 45 }, 'One cream palm-sized thermal label printer, rounded rectangular shape and small blank white label emerging from its front slot, no logos.'),
  item('electronics_phone', 'Nova X2 Smartphone', 4900, { deviceType: 'Phone', brand: 'Unbranded', model: 'X2', condition: 'New', colour: 'Graphite', processor: 'Eight-core mobile processor', ram: 8, storageCapacity: 256, storageType: 'UFS', displaySize: 6.5, displayResolution: '2400 × 1080', panelType: 'AMOLED', cellular: '5G', batteryCapacity: 4500, mainCamera: 48, chargerIncluded: 'Yes' }, 'One graphite smartphone, slim rounded body, 6.5-inch edge-to-edge display showing an abstract blue gradient, two rear camera lenses; front and back views of the same single device.'),
  item('electronics_computers', 'SummitBook 14 Laptop', 9900, { deviceType: 'Laptop', brand: 'Unbranded', model: 'SB14', condition: 'New', colour: 'Silver', processor: 'Six-core notebook processor', ram: 16, memoryType: 'DDR5', storageCapacity: 512, storageType: 'NVMe SSD', displaySize: 14, displayResolution: '1920 × 1200', panelType: 'IPS', operatingSystem: 'Desktop operating system', memoryUpgradeable: 'Yes', usbPorts: 3 }, 'One silver 14-inch laptop open at a gentle angle, black keyboard, large touchpad and abstract warm-neutral wallpaper, no operating-system or manufacturer logos.'),
  item('electronics_displays', 'VistaView 27 QHD Monitor', 3900, { deviceType: 'Monitor', brand: 'Unbranded', model: 'VV27', condition: 'New', colour: 'Black', displaySize: 27, displayResolution: '2560 × 1440', refreshRate: 144, panelType: 'IPS', responseTime: 1, standAdjustment: 'Height and tilt', vesaMount: '100 × 100 mm' }, 'One black 27-inch desktop monitor on a height-adjustable stand, slim bezel, abstract blue and warm cream wallpaper, no computer or keyboard.'),
  item('electronics_cameras', 'FrameOne M24 Mirrorless Camera', 11500, { brand: 'Unbranded', model: 'M24', condition: 'New', colour: 'Black', cameraType: 'Mirrorless', mainCamera: 24, sensorFormat: 'APS-C', includedLens: '16–50 mm zoom lens', imageStabilisation: 'In-body stabilisation', videoResolution: '3840 × 2160', expandableStorage: 'Yes', memoryCardFormat: 'SD' }, 'One black compact mirrorless camera with one attached 16–50 mm zoom lens, textured hand grip, electronic viewfinder and plain blank branding areas.'),
  item('electronics_gaming', 'ArcadeDock Home Console', 6400, { deviceType: 'Console', brand: 'Unbranded', model: 'AD512', condition: 'New', colour: 'White / Black', consolePlatform: 'Fictional ArcadeOS', storageCapacity: 512, storageType: 'SSD', includedControllers: 2, discDrive: 'No', maximumOutputResolution: '3840 × 2160' }, 'One compact white and black home games console with exactly two matching wireless controllers beside it, simple fictional design, no real console logos or game characters.'),
  item('electronics_networking', 'MeshLink AX3000 Router', 1650, { brand: 'Unbranded', model: 'AX3000', condition: 'New', colour: 'White', networkDeviceType: 'Router', wirelessBands: '2.4 GHz / 5 GHz', maximumWirelessSpeed: 3000, wifi: 'Wi-Fi 6', ethernetPorts: 4, meshSupport: 'Yes', networkNodes: 1, networkSecurity: 'WPA3' }, 'One white wireless router with four adjustable antennas, small subtle status LEDs and four ethernet ports visible along the rear edge, no branding.'),
  item('electronics_components', 'RapidStore 1 TB NVMe SSD', 1290, { deviceType: 'Storage', brand: 'Unbranded', model: 'RS1024', condition: 'New', colour: 'Black', storageCapacity: 1024, storageType: 'NVMe SSD', storageInterface: 'PCIe 4.0', formFactor: 'M.2 2280', readSpeed: 5000, writeSpeed: 4200 }, 'One black M.2 2280 NVMe solid-state drive, slim 80 mm circuit board, black chips and gold edge connector, plain blank label with no logos.'),
  item('electronics_smart_home', 'HomeGlow Smart Plug', 350, { brand: 'Unbranded', model: 'HG1', condition: 'New', colour: 'White', smartHomeType: 'Plug / switch', smartHomeProtocol: 'Wi-Fi / Matter', hubRequired: 'No', powerRequirements: '230 V AC', automationFeatures: 'Scheduled on/off control', voiceAssistant: 'Matter-compatible assistants' }, 'One white compact South African Type M three-round-pin smart plug adaptor, single matching Type M socket on the front, tiny indicator and side button, no branding.'),
  item('electronics_audio', 'QuietWave Wireless Headphones', 1450, { brand: 'Unbranded', model: 'QW40', condition: 'New', colour: 'Cream', audioType: 'Headphones', driverSize: 40, noiseCancellation: 'Active', frequencyResponse: '20 Hz–20 kHz', batteryLife: 30, bluetooth: '5.3', microphone: 'Yes', chargingConnector: 'USB-C' }, 'One pair of cream over-ear wireless headphones, softly padded earcups and headband, folded slightly inward, no logo or charging cable.'),
  item('electronics_wearables', 'MoveTrack Fitness Band', 950, { brand: 'Unbranded', model: 'MT42', condition: 'New', colour: 'Black', wearableType: 'Fitness tracker', displaySize: 1.5, displayResolution: '240 × 240', panelType: 'OLED', caseSize: '42 mm', bandSize: 'Adjustable', sensors: 'Heart-rate sensor and accelerometer', compatibleDevices: 'Compatible mobile devices', batteryLife: 120 }, 'One black fitness band with a slim rectangular 1.5-inch display, simple generic time and movement symbols, plain silicone strap, no app or manufacturer logos.'),
  item('electronics_gifts', 'PowerNest USB-C Charger', 490, { deviceType: 'Accessory', brand: 'Unbranded', model: 'PN65', condition: 'New', colour: 'Cream', accessoryType: 'Charger', chargingPower: 65, connectorCompatibility: 'USB-C Power Delivery', ports: 'Two USB-C ports', included: 'One 2 m USB-C cable' }, 'One cream compact 65-watt wall charger with two USB-C ports and exactly one neatly coiled cream USB-C cable, no wattage label or real branding.'),

  item('digital_goods', 'Coastal Texture Photography Pack', 290, { fileFormat: 'JPG', compatibility: 'JPG-compatible image software', licence: 'Personal and commercial use; original files may not be resold or redistributed', assetCount: '24 images', digitalDimensions: '4000 × 3000 px', version: '1.0' }, 'A digital photo-pack preview showing a neat grid of coastal texture photographs: sand ripples, smooth sea stones, foam, pale driftwood and water; floating clean graphic presentation with no physical box.', { stockAvailable: '', hideStockOnCard: true }),
  item('digital_templates', 'Small Studio Invoice Templates', 190, { fileFormat: 'XLSX / PDF', compatibility: 'Spreadsheet and PDF software', licence: 'Business use by one purchaser; template files may not be resold', assetCount: 'Three invoice layouts', version: '1.0', language: 'English' }, 'A digital invoice-template preview showing three distinct clean invoice layouts on floating white panels, simple charcoal rules and sage accents, no client names or financial totals.'),
  item('digital_fonts', 'Harbour Sans Typeface Family', 350, { fileFormat: 'OTF / TTF', compatibility: 'Font-compatible desktop software', licence: 'Desktop licence for one user; font files may not be redistributed', assetCount: 'Six font weights', version: '1.0', language: 'Latin alphabet' }, 'A digital typeface specimen card, cream background, charcoal Harbour Sans title with Aa Bb Cc and six clean sans-serif weight samples, no physical font packaging.'),
  item('digital_courses', 'Foundations of Product Photography', 690, { fileFormat: 'MP4 / PDF', compatibility: 'MP4 video player and PDF reader', licence: 'Personal learning use; videos and workbook may not be redistributed', assetCount: 'Eight videos and one workbook', language: 'English', features: '90 minutes of video, lighting exercises and a printable checklist' }, 'A digital course-cover preview: an unbranded camera and simple tabletop lighting diagram within a cream graphic cover, readable title Product Photography, small play symbol, no course-platform logo.', { stockAvailable: '', hideStockOnCard: true }),

  item('beauty_retail', 'Cloud Citrus Eau de Parfum', 590, { netContent: '50 ml', skinHairType: 'All skin types', shade: 'Citrus and amber', material: 'Liquid fragrance in glass bottle', colour: 'Clear / Amber', usageInstructions: 'Apply sparingly to pulse points', warnings: 'For external use only. Avoid eyes.', shelfLife: '24 months after opening' }, 'One clear 50 ml rectangular fragrance bottle containing pale amber liquid, cream cap and a small plain cream label, no real brand names.'),
  item('beauty_skincare', 'Everyday Oat Gentle Cleanser', 240, { netContent: '150 ml', skinHairType: 'Normal / dry skin', shade: 'Fragrance-free', material: 'Liquid cleanser in recyclable bottle', colour: 'Cream', usageInstructions: 'Massage onto damp skin and rinse', storageInstructions: 'Store away from direct sunlight' }, 'One cream 150 ml cleanser bottle with pump top, simple unbranded label reading Gentle Cleanser, subtle oat-coloured accent, no ingredient props.'),
  item('beauty_makeup', 'Colour Studio Satin Lipstick', 190, { netContent: '3.5 g', skinHairType: 'All skin types', shade: 'Rose clay', material: 'Wax and oil colour formulation', colour: 'Rose clay', usageInstructions: 'Apply directly to lips' }, 'One rose-clay lipstick in a plain matte cream tube, bullet raised and matching cap beside it, smooth satin finish, no logo.', { stockAvailable: 0 }),
  item('beauty_haircare', 'Curl Kind Leave-In Conditioner', 260, { netContent: '250 ml', skinHairType: 'Curly / coily hair', shade: 'Light coconut scent', material: 'Cream conditioner in bottle', colour: 'Cream', usageInstructions: 'Work a small amount through damp hair; do not rinse', storageInstructions: 'Store at room temperature' }, 'One cream 250 ml leave-in conditioner squeeze bottle with sage cap, plain unbranded label reading Leave-In Conditioner, no hair model or coconuts.'),

  item('home_decor', 'Gridline Oak Wall Shelf', 850, { size: '80 × 20 × 3 cm', material: 'Oak', colour: 'Natural oak', furnitureSize: '80 × 20 × 3 cm', loadCapacity: '10 kg', assembly: 'Assembly required', finish: 'Oiled', included: 'Shelf and two concealed mounting brackets' }, 'One natural oak floating wall shelf, 80 cm long with softly rounded front corners, shown alone with two discreet mounting brackets, no decoration on top.'),
  item('home_furniture', 'Forma Oak Dining Chair', 1890, { material: 'Solid oak', colour: 'Natural oak', furnitureSize: '80 × 48 × 50 cm', seatingCapacity: 1, assembly: 'Fully assembled', finish: 'Clear oil', loadCapacity: '120 kg' }, 'One solid oak dining chair, gently curved backrest, shaped wood seat and four tapered legs, no cushion or other furniture.', { weight: 6200, length: 85, width: 52, height: 55 }),
  item('home_soft', 'Daybreak Linen Cushion Cover', 190, { size: '45 × 45 cm', material: 'Linen', colour: 'Sun / Rust / Slate', fabricComposition: '100% linen', pattern: 'Fine stripe', fastening: 'Concealed zip', fill: 'Cover only; cushion insert not included' }, 'One folded golden-sun linen cushion cover, 45 × 45 cm, fine cream stripe, concealed zip visible at one edge; empty cover with no cushion insert.', { variantPreset: 'cushion', compareAtPrice: 240 }),
  item('home_accents', 'Amber Hour Soy Candle', 240, { size: '200 g', material: 'Soy wax in glass', colour: 'Amber', scent: 'Amber / cedar', burnTime: 40, careInstructions: 'Trim wick before use and never leave a burning candle unattended' }, 'One amber glass candle jar containing cream soy wax and a single unlit cotton wick, 200 g size, simple plain label, no flame or extra jars.'),
  item('home_kitchenware', 'Cookline Stainless Saucepan', 690, { size: '2 L', material: 'Stainless steel', colour: 'Brushed steel', volume: 2, finish: 'Brushed steel', included: 'One saucepan and one matching steel lid', careInstructions: 'Wash after use and dry thoroughly' }, 'Exactly one two-litre brushed stainless steel saucepan with long steel handle and one matching steel lid resting beside it, no food.'),

  item('florists_retail', 'Seasonal Table Posy Trio', 490, { size: 'Three mini arrangements', material: 'Fresh flowers and glass', colour: 'White / Blush / Green', flowerVarieties: 'Daisies and roses', bouquetSize: 'Three 20 cm posies', packQuantity: 3, vaseIncluded: 'Three small glass vases' }, 'Exactly three small clear glass vases each containing one miniature fresh posy of white daisies, blush roses and green foliage, all three arrangements visible.'),
  item('florist_bouquets', 'Cape Garden Hand-Tied Bouquet', 550, { flowerVarieties: 'Roses and lisianthus', bouquetSize: 'Twelve stems, medium', occasion: 'Everyday gifting', vaseIncluded: 'No', seasonalSubstitutions: 'Similar colours and value may replace unavailable stems' }, 'One hand-tied bouquet of exactly twelve rose and lisianthus flower stems in blush and cream with green foliage, wrapped in plain cream paper and cotton ribbon, no vase.'),
  item('florist_plants', 'Monstera in a Ceramic Pot', 650, { plantName: 'Monstera deliciosa', plantSize: '60 cm', potSize: '20 cm', plantPlacement: 'Indoor', lightNeeds: 'Bright indirect light', watering: 'Water when the top 3 cm of soil is dry', petSafe: 'Potentially toxic to pets', potIncluded: 'One cream ceramic pot' }, 'One healthy 60 cm Monstera deliciosa with split green leaves in a plain cream 20 cm ceramic pot, no other plants.'),
  item('florist_events', 'White & Green Event Centrepiece', '', { flowerVarieties: 'White roses and eucalyptus', bouquetSize: '40 cm wide', occasion: 'Wedding or event', vaseIncluded: 'One low glass vase', deliveryNotes: 'Arrangement and collection details confirmed in the quote' }, 'One low 40 cm-wide event centrepiece of white roses and eucalyptus in one clear low glass vase, no table settings or event scene.', { quoteBased: true, stockAvailable: '', stockLabel: 'Made to order' }),

  item('pet_supplies', 'Everyday Adjustable Dog Harness', 350, { animal: 'Dog', size: 'S / M / L', lifeStage: 'Adult', material: 'Nylon and metal', colour: 'Moss green', compatibility: 'Adjustable chest circumference 45–80 cm', features: 'Padded straps and one lead attachment ring' }, 'One moss green padded nylon dog harness with adjustable straps, black buckles and one metal lead ring, no dog.'),
  item('pet_food', 'Adult Chicken Dog Food 2 kg', 290, { animal: 'Dog', netContent: '2 kg', lifeStage: 'Adult', flavour: 'Chicken', material: 'Dry kibble in sealed bag', colour: 'Cream / Sage', ingredients: 'Illustrative chicken-and-grain recipe; see package details', feedingGuide: 'Follow the supplied pack guide for the dog’s weight and activity', storageInstructions: 'Store sealed in a cool, dry place' }, 'One sealed upright two-kilogram dry dog-food bag, cream and sage packaging, readable generic text Adult Dog Food, Chicken, 2 kg, small dog silhouette; no loose kibble or real brand.', { stockAvailable: 2, lowStockThreshold: 3 }),
  item('pet_toys', 'TugTrail Braided Rope Toy', 150, { animal: 'Dog', size: '35 cm', lifeStage: 'Adult', material: 'Cotton rope', colour: 'Natural / Terracotta', features: 'Three knots for tug play' }, 'One 35 cm braided cotton dog rope toy, natural cream and terracotta strands, exactly three large knots, no dog.'),
  item('pet_grooming_products', 'SoftTouch Slicker Brush', 220, { animal: 'Dogs / cats', size: 'Medium', lifeStage: 'Adult', material: 'Bamboo and stainless steel', colour: 'Natural bamboo', compatibility: 'Medium to long coats' }, 'One medium pet slicker brush, bamboo handle, rectangular cushioned brush head and fine stainless pins, no animal or extra brush.'),

  item('electronics_phone', 'SlatePad 10 Drawing Tablet', 3600, { deviceType: 'Tablet', brand: 'Unbranded', model: 'SP10', condition: 'New', colour: 'Silver', processor: 'Eight-core tablet processor', ram: 6, storageCapacity: 128, displaySize: 10, displayResolution: '2000 × 1200', panelType: 'IPS', stylusSupport: 'Yes', included: 'Tablet and one stylus' }, 'One silver 10-inch tablet showing a simple abstract drawing canvas, with exactly one plain silver stylus beside it, no keyboard or app branding.', { suffix: 'tablet' }),
  item('electronics_computers', 'StudioCore Mini Desktop', 7900, { deviceType: 'Desktop', brand: 'Unbranded', model: 'SC8', condition: 'Refurbished', colour: 'Graphite', processor: 'Eight-core desktop processor', ram: 32, memoryType: 'DDR5', storageCapacity: 1024, storageType: 'NVMe SSD', usbPorts: 4, conditionNotes: 'Professionally cleaned; light marks on case; functional demo example' }, 'One graphite compact mini desktop computer, square metal case with vented sides, front power button and four small ports; no monitor, keyboard or logos.', { suffix: 'desktop' }),
  item('electronics_displays', 'Screenline 55 4K Television', 7900, { deviceType: 'TV', brand: 'Unbranded', model: 'SL55', condition: 'New', colour: 'Black', displaySize: 55, displayResolution: '3840 × 2160', refreshRate: 60, panelType: 'LCD', tvTuner: 'Digital terrestrial tuner', hdmi: '2.0', included: 'Television, feet and one remote' }, 'One black 55-inch television on two slim feet, abstract warm landscape wallpaper and one plain remote beside it, no streaming-service logos.', { suffix: 'tv' }),
  item('electronics_components', 'RenderCore 8 GB Graphics Card', 4900, { deviceType: 'Component', brand: 'Unbranded', model: 'RC8', condition: 'New', colour: 'Black', componentType: 'Graphics card', graphicsMemory: 8, memoryType: 'GDDR6', formFactor: 'Dual-slot', connectorCompatibility: 'PCIe 4.0', cooling: 'Two fans', ports: 'Two DisplayPort and one HDMI' }, 'One black dual-slot graphics card with exactly two cooling fans, plain metal backplate, gold PCIe connector and rear display ports, no real manufacturer logo.', { suffix: 'component' })
];

const FAMILY_GUIDES = {
  appliance: ['Appliances describe their model, capacity, power and installation needs.', 'Open Specifications and compare capacity, power and installation details.'],
  toy: ['Toys and games describe age suitability, contents and play details.', 'Open Specifications and inspect the recommended age and included pieces.'],
  baby: ['Baby essentials describe age, size, fit and applicable weight limits.', 'Open Specifications and inspect age suitability, dimensions and included items.'],
  garden: ['Garden and outdoor supplies describe use, size, reach and compatibility.', 'Open Specifications and check the intended use and compatible fittings.'],
  automotive: ['Vehicle parts and accessories use regular product checkout and explain fitment.', 'Open Specifications and check vehicle compatibility and the part or tyre details.'],
  household: ['Household supplies describe pack size, intended use and instructions.', 'Open Specifications and compare pack contents and usage instructions.'],
  instrument: ['Musical instruments describe instrument type, size, level and connections.', 'Open Specifications and inspect the instrument details and included accessories.'],
  tool: ['Retail tools and DIY supplies describe size, power and compatibility.', 'Open Specifications and compare size, electrical requirements and included items.'],
  personalCare: ['Personal care products describe pack contents and intended use.', 'Open Specifications and inspect contents and use instructions.'],
  office: ['Office supplies describe size, pack quantity and compatibility.', 'Open Specifications and check the paper or filing details.'],
  officeDevice: ['Printers describe technology, paper formats, speed and connectivity.', 'Open Specifications and compare print technology, paper sizes and connections.'],
  craft: ['Craft materials describe medium, size and compatible tools or surfaces.', 'Open Specifications and compare pack contents and material compatibility.'],
  power: ['Portable backup power describes battery energy, rated output and ports.', 'Open Specifications and compare battery capacity in Wh with output power in W.'],
  generic: ['Useful size and material details sit beneath the name.', 'Open Specifications and add a relevant detail from Add specification.'],
  apparel: ['Clothing has size, fit and fabric details.', 'Compare the fit and size specifications with the available options.'],
  footwear: ['Footwear keeps its size system explicit.', 'Open Specifications and compare shoe size, upper material and sole material.'],
  jewellery: ['Jewelry separates metal, size and stone details.', 'Open Specifications and compare the metal, purity and size.'],
  watch: ['A watch has movement and case specifications.', 'Open Specifications and inspect movement, case diameter and strap details.'],
  bag: ['Bags can describe material, dimensions and capacity.', 'Open Specifications and compare the size with its capacity.'],
  art: ['Art records its creator, medium, size and edition.', 'Open Specifications and inspect framing and edition details.'],
  ceramic: ['Ceramics can show capacity, glaze and care details.', 'Open Specifications and inspect capacity and dishwasher information.'],
  textile: ['Textiles can describe fabric, pattern and construction.', 'Open Specifications and inspect material and weave.'],
  gift: ['A gift can describe its occasion and personalisation.', 'Open Specifications and read the personalisation details.'],
  collectible: ['Collectibles keep era and condition notes visible.', 'Open Specifications and compare release and condition notes.'],
  sports: ['Sports gear describes its activity, size and materials.', 'Open Specifications and inspect the intended experience level.'],
  outdoor: ['Outdoor gear has capacity and weather-related details.', 'Open Specifications and compare capacity, packed size and season rating.'],
  book: ['Books record author, format and language.', 'Open Specifications and inspect publication and page details.'],
  stationery: ['Stationery has paper size, ruling and page details.', 'Open Specifications and inspect the paper or pen details.'],
  digital: ['Digital products describe formats, compatibility and usage rights.', 'Open Specifications and read the licence and included files.'],
  beauty: ['Beauty products show net contents and the selected shade or scent.', 'Open Specifications and inspect contents, intended skin or hair type and use instructions.'],
  furniture: ['Furniture has dimensions, materials and assembly details.', 'Open Specifications and inspect size and assembly information.'],
  soft: ['Soft furnishings have size, fabric and closure details.', 'Open Specifications and check whether an insert is included.'],
  decor: ['Home accents describe materials, size and finish.', 'Open Specifications and inspect the added details for this item.'],
  flowers: ['Flower listings can describe stems, arrangement size and included vessels.', 'Open Specifications and inspect varieties and vase information.'],
  plant: ['Plants have variety, size, placement and care information.', 'Open Specifications and inspect light, water and pet-safety details.'],
  pet: ['Pet products describe the intended animal, size and fit.', 'Open Specifications and compare size and compatibility.'],
  petFood: ['Pet food has contents, recipe and life-stage details.', 'Open Specifications and inspect the pack size and feeding guidance.'],
  vehicle: ['A vehicle shows year and mileage and accepts enquiries or viewing requests.', 'Open Specifications, then compare availability and the asking price.'],
  electronics: ['Electronics specifications adapt to the selected device type.', 'Open Specifications and compare the device details shown beneath its name.']
};

function variantsFor(product, preset) {
  const axes = {
    tee: [['Size', ['XS', 'S', 'M', 'L']], ['Colour', ['Natural', 'Ink']]],
    leggings: [['Size', ['S', 'M', 'L']], ['Colour', ['Black', 'Moss']], ['Length', ['Full length', 'Cropped']]],
    satchel: [['Size', ['Mini', 'Standard']]],
    cushion: [['Colour', ['Sun', 'Rust', 'Slate']]]
  }[preset];
  if (!axes) return { options: [], variants: [] };
  const options = axes.map(([name, values]) => ({ id: `${product.id}-option-${name.toLowerCase()}`, name, values }));
  const combinations = axes.reduce((all, [name, values]) => all.flatMap(prior => values.map(value => ({ ...prior, [name]: value }))), [{}]);
  const variants = combinations.map((optionValues, index) => {
    const price = preset === 'satchel' && optionValues.Size === 'Standard' ? 890 : product.price;
    const unavailable = preset === 'tee' && optionValues.Size === 'M' && optionValues.Colour === 'Ink';
    return {
      id: `${product.id}-variant-${Object.values(optionValues).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      optionValues, title: Object.values(optionValues).join(' / '), price,
      compareAtPrice: product.compareAtPrice, cost: Math.round(price * 0.55),
      sku: `${product.sku}-${index + 1}`, stockAvailable: unavailable ? 0 : preset === 'tee' && index === 1 ? 2 : 8 + index,
      lowStockThreshold: '', available: !unavailable,
      weight: product.weight, weightUnit: 'g', length: product.length, width: product.width, height: product.height, dimensionUnit: 'cm',
      imageUrl: preset === 'tee' ? `${MEDIA_ROOT}/${product.id}${optionValues.Colour === 'Ink' ? '-alternate' : ''}.webp` : ''
    };
  });
  return { options, variants };
}

function createProduct(row) {
  const template = getProductCategoryTemplate(row.leaf);
  const id = `showcase-product-${row.leaf}${row.suffix ? `-${row.suffix}` : ''}`;
  const enquiry = ['vehicle', 'equipment'].includes(template.listingType);
  const details = template.listingType === 'physical'
    ? { brand: 'Unbranded', colour: 'Natural', condition: 'New', ...row.specifications }
    : { ...row.specifications };
  const product = {
    id, name: row.name, description: row.subject,
    catalogTemplateId: template.id, listingType: template.listingType,
    exploreMainCategoryId: template.mainCategoryId, exploreSubcategoryId: row.leaf,
    category: PARENTS[template.mainCategoryId], vendor: 'Book & Buy Showcase',
    price: row.price, compareAtPrice: row.compareAtPrice ?? '', currency: 'R',
    quoteBased: Boolean(row.quoteBased), priceType: row.quoteBased ? 'quote' : 'fixed',
    transactionMode: enquiry ? 'enquiry' : 'checkout', listingAvailability: row.listingAvailability || 'available',
    status: 'active', active: true, cost: row.price === '' ? '' : Math.round(row.price * 0.55),
    sku: `BBS-${row.leaf.replace(/_/g, '-').toUpperCase()}${row.suffix ? `-${row.suffix.toUpperCase()}` : ''}`,
    stockAvailable: enquiry ? '' : row.stockAvailable ?? 20, lowStockThreshold: row.lowStockThreshold ?? 3,
    stockLabel: row.stockLabel || '', hideStockOnCard: Boolean(row.hideStockOnCard),
    weight: row.weight ?? '', weightUnit: 'g', length: row.length ?? '', width: row.width ?? '', height: row.height ?? '', dimensionUnit: 'cm',
    imageUrls: [`${MEDIA_ROOT}/${id}.webp`], options: [], variants: [],
    [listingDetailsKey({ listingType: template.listingType })]: details
  };
  if (row.variantPreset) Object.assign(product, variantsFor(product, row.variantPreset));
  if (row.leaf === 'clothing_tops') product.imageUrls.push(`${MEDIA_ROOT}/${id}-alternate.webp`);
  if (row.leaf === 'vehicles_cars') product.imageUrls.push(`${MEDIA_ROOT}/${id}-interior.webp`);
  Object.assign(product, normalizeListing(product));
  const normalizedDetails = product[listingDetailsKey(product)];
  product.listingSpecFields = getApplicableListingSchema(product).flatMap(group => group.fields)
    .filter(field => !field.required && !field.essential && Object.hasOwn(normalizedDetails, field.key)).map(field => field.key);
  return product;
}

/** Fresh objects keep local demo edits from changing the source showcase. */
export function createShowcaseProducts() {
  const retailOrder = RETAIL_MAIN_CATEGORIES.map(group => group.id);
  return ROWS.map(createProduct).sort((a, b) => retailOrder.indexOf(a.exploreMainCategoryId) - retailOrder.indexOf(b.exploreMainCategoryId));
}

const products = createShowcaseProducts();
export const SHOWCASE_PRODUCT_GUIDES = Object.freeze(Object.fromEntries(products.map((product, index) => {
  const row = ROWS.find(row => product.id === `showcase-product-${row.leaf}${row.suffix ? `-${row.suffix}` : ''}`);
  const template = getProductCategoryTemplate(row.leaf);
  const [whatShows, tryThis] = FAMILY_GUIDES[template.family];
  const guide = { whatShows, tryThis };
  if (row.variantPreset === 'tee') Object.assign(guide, { whatShows: 'Size and colour create eight options with sale pricing, low stock and one unavailable option.', tryThis: 'Open Options to compare sizes and colours, then open Stock to inspect each option’s quantity.' });
  if (row.variantPreset === 'leggings') Object.assign(guide, { whatShows: 'Three option choices combine size, colour and length into twelve options.', tryThis: 'Open Options and compare the three choices; inspect their individual stock on Stock.' });
  if (row.variantPreset === 'satchel') Object.assign(guide, { whatShows: 'Different option prices create a starting price on the product card.', tryThis: 'Compare Mini and Standard prices in Options, then return to the product list.' });
  if (row.variantPreset === 'cushion') Object.assign(guide, { whatShows: 'Three colour options share one price and have separate quantities.', tryThis: 'Open Options to compare equal pricing, then inspect colour quantities on Stock.' });
  if (row.leaf === 'pet_food') Object.assign(guide, { whatShows: 'Pet food has its own contents and life-stage specifications, plus a low-stock warning.', tryThis: 'Open Stock and compare the two remaining packs with the warning level of three.' });
  if (row.leaf === 'beauty_makeup') Object.assign(guide, { whatShows: 'An active product can have no remaining stock.', tryThis: 'Open Stock to inspect the zero quantity and compare its availability in the public preview.' });
  if (row.quoteBased) Object.assign(guide, { whatShows: 'A quote-only product has no fixed cart price.', tryThis: 'Open Details to inspect Quote only, then read the arrangement specifications.' });
  if (row.listingAvailability) Object.assign(guide, { whatShows: `This enquiry listing is ${row.listingAvailability} while remaining an active catalog record.`, tryThis: 'Open Specifications and inspect Listing availability, then compare its public preview.' });
  if (template.family === 'digital') guide.limit = 'File formats and licences describe the product. Automatic file delivery is not configured in this demo.';
  if (row.leaf === 'handmade_gifts') guide.limit = 'Personalisation is described in specifications; engraving details are arranged with the client.';
  return [product.id, Object.freeze(guide)];
})));

const PHOTO_STYLE = 'Create a polished realistic square catalog image. Warm neutral off-white seamless studio background, soft natural side light, subtle grounded shadow, object centred with generous clean margins. Accurate object count, materials, proportions and colours. No people, real brands, manufacturer logos, watermarks, price stickers or unrelated decorative props. Only requested title text on book covers, digital previews or generic packaging may appear.';
export const SHOWCASE_PRODUCT_MEDIA_JOBS = Object.freeze([
  ...products.map((product, index) => Object.freeze({
    id: product.id, kind: 'product', path: `public${product.imageUrls[0]}`,
    subject: ROWS.find(row => product.id === `showcase-product-${row.leaf}${row.suffix ? `-${row.suffix}` : ''}`).subject,
    prompt: `${PHOTO_STYLE} Subject: ${ROWS.find(row => product.id === `showcase-product-${row.leaf}${row.suffix ? `-${row.suffix}` : ''}`).subject} The merchandise is fictional. Its supplied specification summary is ${listingFacts(product).join('; ')}.`
  })),
  Object.freeze({ id: 'showcase-product-clothing_tops-alternate', kind: 'product', path: 'public/example/book-and-buy-showcase/products/showcase-product-clothing_tops-alternate.webp', subject: 'Ink colour of Ribbed Cotton Crew Tee', prompt: `${PHOTO_STYLE} Exactly one fitted ribbed cotton crew-neck T-shirt in deep ink navy, short sleeves, clean front, visible fine rib texture. It is the same simple cut as the natural ivory tee; no print or logo.` }),
  Object.freeze({ id: 'showcase-product-vehicles_cars-interior', kind: 'product', path: 'public/example/book-and-buy-showcase/products/showcase-product-vehicles_cars-interior.webp', subject: 'Charcoal interior of Cityline Hatchback', prompt: `${PHOTO_STYLE} Interior detail photograph from the open passenger door of a fictional unbranded silver compact hatchback. Charcoal cloth front seats, simple dark dashboard, round steering wheel, automatic gear selector and centre screen. No people, real logos, paperwork or visible exterior model badges. Interior materials match a modest 2022 five-door hatchback.` })
]);
