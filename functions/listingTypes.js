// Shared catalogue contract. Vehicles and equipment receive enquiries; electronics use retail checkout.
import { getProductTemplate, PHYSICAL_SCHEMA, PRODUCT_CATEGORY_GROUPS, productTemplateSchema, productTemplateFacts, productTemplateAllowsField } from './catalogTemplates.js';
export const LISTING_TYPES = Object.freeze([
  { id: 'physical', label: 'Physical product', description: 'Sell products with prices, options and stock.', mode: 'checkout' },
  { id: 'electronics', label: 'Electronics & technology', description: 'Sell technology with useful device specifications, options and stock.', mode: 'checkout' },
  { id: 'vehicle', label: 'Vehicle', description: 'Showcase a car and receive enquiries or viewing requests.', mode: 'enquiry' },
  { id: 'equipment', label: 'Equipment & machinery', description: 'List specialist equipment with specifications and enquiries.', mode: 'enquiry' }
]);
const text = (key, label, extra = {}) => ({ key, label, ...extra });
const number = (key, label, unit = '', extra = {}) => ({ key, label, unit, type: 'number', min: 0, max: 100000000, ...extra });
const select = (key, label, options, extra = {}) => ({ key, label, options, ...extra });
export const VEHICLE_SCHEMA = [
  { label: 'Vehicle', fields: [text('make','Make',{required:true,essential:true}),text('model','Model',{required:true,essential:true}),text('derivative','Derivative / trim'),number('year','Year','',{required:true,essential:true,integer:true,min:1900,max:2100}),select('condition','Condition',['New','Used','Demo'],{required:true,essential:true}),number('mileage','Mileage','km',{integer:true,essential:true}),select('transmission','Transmission',['Manual','Automatic','CVT','Dual-clutch','Other'],{essential:true}),select('fuel','Fuel / energy',['Petrol','Diesel','Electric','Hybrid','Plug-in hybrid','Other'],{essential:true}),select('body','Body style',['Hatchback','Sedan','SUV','Coupe','Convertible','Estate','MPV','Bakkie','Van','Other'],{essential:true}),text('colour','Exterior colour'),text('location','Location',{required:true,essential:true}),text('reference','Listing reference'),number('owners','Previous owners','',{integer:true,max:100}),select('serviceHistory','Service history',['Full','Partial','None','Unknown']),text('warranty','Warranty details')] },
  { label: 'Engine & performance', fields: [number('engineCapacity','Engine capacity','L',{max:30}),number('cylinders','Cylinders','',{integer:true,max:32}),number('power','Power','kW',{max:10000}),number('torque','Torque','Nm',{max:20000}),select('drivetrain','Driven wheels',['Front-wheel drive','Rear-wheel drive','All-wheel drive','4x4','Other']),number('topSpeed','Top speed','km/h',{max:1000}),number('acceleration','0–100 km/h','sec',{max:200})] },
  { label: 'Efficiency & electric', fields: [number('consumption','Fuel consumption','L/100 km',{max:100}),number('co2','CO₂ emissions','g/km',{max:5000}),number('tankCapacity','Fuel tank','L',{max:1000}),number('batteryCapacity','Battery capacity','kWh',{max:1000}),number('range','Stated range','km',{max:10000}),text('rangeStandard','Range test standard'),number('acCharging','AC charging','kW',{max:1000}),number('dcCharging','DC charging','kW',{max:2000})] },
  { label: 'Dimensions & capacity', fields: [number('seats','Seats','',{integer:true,max:100}),number('doors','Doors','',{integer:true,max:10}),number('length','Length','mm',{max:30000}),number('width','Width','mm',{max:10000}),number('height','Height','mm',{max:10000}),number('wheelbase','Wheelbase','mm',{max:20000}),number('clearance','Ground clearance','mm',{max:3000}),number('weight','Kerb weight','kg',{max:100000}),number('bootCapacity','Boot capacity','L',{max:20000}),number('airbags','Airbags','',{integer:true,max:30})] },
  { label: 'Features', fields: [text('safetyFeatures','Safety features',{multiline:true,maxLength:1200,hint:'List actual equipment, such as ABS, stability control, ISOFIX and parking assistance.'}),text('comfortFeatures','Comfort & technology',{multiline:true,maxLength:1200,hint:'Climate control, navigation, connectivity, upholstery, wheels and other fitted equipment.'})] }
];
export const EQUIPMENT_SCHEMA = [
  { label: 'Equipment', fields: [text('manufacturer','Manufacturer',{required:true,essential:true}),text('model','Model',{required:true,essential:true}),text('equipmentType','Equipment type',{required:true,essential:true}),number('year','Year','',{essential:true,integer:true,min:1900,max:2100}),select('condition','Condition',['New','Used','Refurbished'],{required:true,essential:true}),text('location','Location',{required:true,essential:true}),text('reference','Listing reference'),number('operatingHours','Operating hours','h'),text('capacity','Capacity / output'),text('powerSupply','Power / energy requirements'),text('dimensions','Dimensions'),text('weight','Weight'),text('warranty','Warranty details'),text('specifications','Additional specifications',{multiline:true,maxLength:1600}),text('included','What is included',{multiline:true,maxLength:1200})] },
  { label: 'Power & output', fields: [
    number('ratedPower','Rated output','kW',{max:1000000,essentialTemplateIds:['equipment_generator','equipment_workshop','equipment_tool']}),
    number('apparentPower','Apparent power','kVA',{max:1000000,templateIds:['equipment_generator']}),
    select('fuel','Fuel / energy',['Petrol','Diesel','Electric','Gas','Battery','Other'],{templateIds:['equipment_generator','equipment_construction','equipment_agricultural'],essentialTemplateIds:['equipment_generator']}),
    number('voltage','Voltage','V',{max:1000000,templateIds:['equipment_generator','equipment_workshop','equipment_tool','equipment_commercial']}),
    select('phase','Electrical phase',['Single phase','Three phase','Other'],{templateIds:['equipment_generator','equipment_workshop','equipment_commercial']}),
    number('frequency','Frequency','Hz',{max:100000,templateIds:['equipment_generator']}),
    number('tankCapacity','Tank capacity','L',{max:1000000,templateIds:['equipment_generator','equipment_construction','equipment_agricultural']}),
    number('ratedRuntime','Stated runtime','h',{max:100000,templateIds:['equipment_generator']}),
    number('noiseLevel','Stated sound level','dB',{max:250}),
    number('operatingPressure','Operating pressure','bar',{max:100000,templateIds:['equipment_workshop','equipment_tool','equipment_commercial']}),
    number('flowRate','Flow rate','L/min',{max:10000000,templateIds:['equipment_workshop','equipment_tool','equipment_commercial','equipment_agricultural']}),
    number('workingWidth','Working width','mm',{max:100000,templateIds:['equipment_agricultural','equipment_workshop','equipment_tool']}),
    number('liftingCapacity','Lifting capacity','kg',{max:10000000,templateIds:['equipment_construction','equipment_workshop']}),
    number('maximumReach','Maximum reach','m',{max:10000,templateIds:['equipment_construction']}),
    text('attachmentCompatibility','Attachment compatibility',{templateIds:['equipment_construction','equipment_agricultural','equipment_tool']})
  ] }
];
export const ELECTRONICS_DEVICE_TYPES = Object.freeze(['Phone','Tablet','Laptop','Desktop','Monitor','TV','Audio','Camera','Console','Wearable','Networking','Component','Storage','Accessory','Smart home','Other']);
const computingDevices = ['Phone','Tablet','Laptop','Desktop'];
const screenDevices = ['Phone','Tablet','Laptop','Monitor','TV','Wearable'];
const connectedDevices = ['Phone','Tablet','Laptop','Desktop','TV','Audio','Camera','Console','Wearable','Networking','Smart home'];
const batteryDevices = ['Phone','Tablet','Laptop','Audio','Camera','Console','Wearable','Accessory','Smart home'];
const electronicChoice = ['Yes','No','Not specified'];
const forDevices = (...deviceTypes) => ({ deviceTypes });
export const ELECTRONICS_SCHEMA = [
  { label: 'Device basics', fields: [
    select('deviceType','Device type',ELECTRONICS_DEVICE_TYPES,{required:true,essential:true}),
    text('brand','Brand',{required:true,essential:true}),
    text('model','Model',{required:true,essential:true}),
    select('condition','Condition',['New','Used','Refurbished','Open-box','Demo'],{required:true,essential:true}),
    text('colour','Colour / finish'),
    number('releaseYear','Release year','',{integer:true,min:1970,max:2100}),
    text('warranty','Warranty details'),
    text('included','In the box',{multiline:true,maxLength:1200}),
    text('conditionNotes','Condition notes',{multiline:true,maxLength:1200,hint:'Describe cosmetic wear, repairs and any known limitations.'}),
    text('features','Other features',{multiline:true,maxLength:1600})
  ] },
  { label: 'Performance & software', fields: [
    text('processor','Processor / chip',{essential:true,essentialDeviceTypes:computingDevices,...forDevices(...computingDevices,'Component')}),
    number('processorCores','Processor cores','',{integer:true,max:256,...forDevices(...computingDevices,'Component')}),
    number('processorClock','Processor clock speed','GHz',{max:20,...forDevices(...computingDevices,'Component')}),
    number('ram','Memory / RAM','GB',{essential:true,essentialDeviceTypes:computingDevices,max:100000,...forDevices(...computingDevices,'Component')}),
    select('memoryType','Memory type',['DDR3','DDR4','DDR5','LPDDR3','LPDDR4','LPDDR4X','LPDDR5','LPDDR5X','GDDR5','GDDR6','GDDR6X','GDDR7','Other'],forDevices(...computingDevices,'Component')),
    text('graphics','Graphics / GPU',forDevices('Laptop','Desktop','Console','Component')),
    number('graphicsMemory','Graphics memory','GB',{max:1000,...forDevices('Laptop','Desktop','Component')}),
    text('operatingSystem','Operating system',forDevices(...computingDevices,'TV','Wearable','Console','Smart home')),
    text('softwareCompatibility','Software / system compatibility',{multiline:true,maxLength:600,...forDevices('Accessory','Component','Storage','Smart home','Wearable')}),
    select('memoryUpgradeable','Upgradeable memory',electronicChoice,forDevices('Laptop','Desktop'))
  ] },
  { label: 'Storage', fields: [
    number('storageCapacity','Storage capacity','GB',{essential:true,max:1000000,...forDevices(...computingDevices,'Console','Storage')}),
    select('storageType','Storage type',['NVMe SSD','SATA SSD','SSD','HDD','eMMC','UFS','Flash','Memory card','Other'],forDevices(...computingDevices,'Console','Storage')),
    text('storageInterface','Storage interface',forDevices('Laptop','Desktop','Storage','Component')),
    select('expandableStorage','Expandable storage',electronicChoice,forDevices('Phone','Tablet','Laptop','Desktop','Console','Camera')),
    text('memoryCardFormat','Memory card format',forDevices('Phone','Tablet','Camera','Storage')),
    number('readSpeed','Sequential read speed','MB/s',{max:100000,...forDevices('Storage','Laptop','Desktop')}),
    number('writeSpeed','Sequential write speed','MB/s',{max:100000,...forDevices('Storage','Laptop','Desktop')}),
    number('driveSpeed','Drive rotation speed','rpm',{integer:true,max:30000,...forDevices('Storage')}),
    number('storageEndurance','Storage endurance','TBW',{max:1000000,...forDevices('Storage')}),
    text('encryption','Hardware encryption',forDevices('Storage'))
  ] },
  { label: 'Display', fields: [
    number('displaySize','Display size','in',{essential:true,max:500,...forDevices(...screenDevices)}),
    text('displayResolution','Display resolution',{essential:true,hint:'For example 2560 × 1440 or 3840 × 2160.',...forDevices(...screenDevices)}),
    select('panelType','Panel type',['LCD','IPS','VA','TN','OLED','AMOLED','QLED','Mini-LED','MicroLED','E-ink','Other'],forDevices(...screenDevices)),
    number('refreshRate','Refresh rate','Hz',{max:2000,...forDevices(...screenDevices)}),
    number('responseTime','Response time','ms',{max:1000,...forDevices('Monitor','TV')}),
    number('brightness','Brightness','nits',{max:10000,...forDevices(...screenDevices)}),
    select('touchscreen','Touchscreen',electronicChoice,forDevices(...screenDevices)),
    text('hdrSupport','HDR formats',forDevices('Phone','Tablet','Laptop','Monitor','TV')),
    text('aspectRatio','Aspect ratio',forDevices('Laptop','Monitor','TV')),
    text('adaptiveSync','Adaptive sync',forDevices('Laptop','Monitor','TV')),
    text('colourGamut','Colour gamut',forDevices('Laptop','Monitor','TV')),
    text('vesaMount','VESA mounting pattern',forDevices('Monitor','TV')),
    number('screenCurvature','Screen curvature','R',{max:10000,...forDevices('Monitor','TV')}),
    text('standAdjustment','Stand adjustment',forDevices('Monitor')),
    text('tvTuner','TV tuner',forDevices('TV')),
    select('stylusSupport','Stylus support',electronicChoice,forDevices('Phone','Tablet','Laptop'))
  ] },
  { label: 'Power & battery', fields: [
    number('batteryCapacity','Battery capacity','mAh',{max:1000000,...forDevices(...batteryDevices)}),
    number('batteryEnergy','Battery energy','Wh',{max:100000,...forDevices(...batteryDevices)}),
    number('batteryLife','Stated battery life','h',{max:100000,...forDevices(...batteryDevices)}),
    number('batteryHealth','Battery health','%',{max:100,...forDevices('Phone','Tablet','Laptop','Wearable')}),
    number('chargingPower','Charging power','W',{max:10000,...forDevices(...batteryDevices)}),
    text('chargingConnector','Charging connector',forDevices(...batteryDevices)),
    select('wirelessCharging','Wireless charging',electronicChoice,forDevices('Phone','Tablet','Audio','Wearable')),
    select('chargerIncluded','Charger included',electronicChoice,forDevices(...batteryDevices)),
    number('powerConsumption','Power consumption','W',{max:100000,...forDevices('Desktop','Monitor','TV','Audio','Networking','Storage','Smart home','Component')}),
    number('powerSupply','Power supply rating','W',{max:100000,...forDevices('Desktop','Component')}),
    text('powerRequirements','Power requirements',forDevices('Desktop','Monitor','TV','Audio','Networking','Component','Storage','Smart home'))
  ] },
  { label: 'Connectivity & ports', fields: [
    text('wifi','Wi-Fi standard',forDevices(...connectedDevices)),
    text('bluetooth','Bluetooth version',forDevices(...connectedDevices,'Accessory')),
    select('cellular','Mobile network',['2G','3G','4G LTE','5G','None','Other'],forDevices('Phone','Tablet','Laptop','Wearable','Networking')),
    text('simSupport','SIM / eSIM support',forDevices('Phone','Tablet','Wearable','Networking')),
    select('nfc','NFC',electronicChoice,forDevices('Phone','Tablet','Audio','Wearable','Smart home')),
    select('gps','GPS / satellite positioning',electronicChoice,forDevices('Phone','Tablet','Camera','Wearable')),
    text('ports','Ports & connectors',{multiline:true,maxLength:800,...forDevices('Phone','Tablet','Laptop','Desktop','Monitor','TV','Audio','Camera','Console','Networking','Component','Storage','Accessory','Smart home')}),
    number('usbPorts','USB port count','',{integer:true,max:100,...forDevices('Laptop','Desktop','Monitor','TV','Console','Networking','Accessory')}),
    text('usbStandard','USB standard',forDevices('Phone','Tablet','Laptop','Desktop','Monitor','Storage','Accessory')),
    text('thunderbolt','Thunderbolt support',forDevices('Laptop','Desktop','Monitor','Storage','Accessory')),
    text('hdmi','HDMI version',forDevices('Laptop','Desktop','Monitor','TV','Console','Component','Accessory')),
    text('displayPort','DisplayPort version',forDevices('Laptop','Desktop','Monitor','Component','Accessory')),
    select('headphoneJack','Headphone jack',electronicChoice,forDevices('Phone','Tablet','Laptop','Desktop','Monitor','TV','Audio','Console')),
    number('ethernetPorts','Ethernet port count','',{integer:true,max:256,...forDevices('Laptop','Desktop','TV','Console','Networking','Accessory','Smart home')}),
    text('ethernetSpeed','Ethernet speed',forDevices('Laptop','Desktop','TV','Console','Networking','Accessory','Smart home'))
  ] },
  { label: 'Camera & imaging', fields: [
    select('cameraType','Camera type',['Mirrorless','DSLR','Compact','Action','Instant','Video','Webcam','Security','Other'],{essential:true,...forDevices('Camera')}),
    number('mainCamera','Main camera resolution','MP',{max:1000,...forDevices('Phone','Tablet','Camera','Smart home')}),
    number('frontCamera','Front camera resolution','MP',{max:1000,...forDevices('Phone','Tablet','Laptop','Camera')}),
    text('additionalCameras','Additional cameras',{multiline:true,maxLength:600,...forDevices('Phone','Tablet','Camera')}),
    text('sensorFormat','Sensor format',forDevices('Camera')),
    text('lensMount','Lens mount',forDevices('Camera','Accessory')),
    text('includedLens','Included lens',forDevices('Camera')),
    text('focalLength','Focal length range',forDevices('Camera','Accessory')),
    text('aperture','Maximum aperture',forDevices('Camera','Accessory')),
    number('opticalZoom','Optical zoom','×',{max:1000,...forDevices('Phone','Camera')}),
    text('imageStabilisation','Image stabilisation',forDevices('Phone','Tablet','Camera')),
    text('videoResolution','Maximum video resolution',forDevices('Phone','Tablet','Camera','Smart home')),
    number('videoFrameRate','Maximum video frame rate','fps',{max:10000,...forDevices('Phone','Tablet','Camera','Smart home')}),
    number('burstRate','Continuous shooting','fps',{max:10000,...forDevices('Camera')}),
    text('isoRange','ISO range',forDevices('Camera')),
    text('recordingFormats','Recording formats',forDevices('Camera'))
  ] },
  { label: 'Audio', fields: [
    select('audioType','Audio type',['Headphones','Earbuds','Speaker','Soundbar','Amplifier','Receiver','Microphone','Audio interface','Turntable','Other'],{essential:true,...forDevices('Audio')}),
    text('speakerConfiguration','Speaker configuration',forDevices('Audio','TV','Laptop','Desktop','Monitor')),
    number('audioPower','Audio output power','W',{max:100000,...forDevices('Audio','TV')}),
    number('driverSize','Driver size','mm',{max:1000,...forDevices('Audio')}),
    text('frequencyResponse','Frequency response',forDevices('Audio')),
    text('noiseCancellation','Noise cancellation',forDevices('Audio')),
    select('microphone','Built-in microphone',electronicChoice,forDevices('Audio','Laptop','Monitor','Camera','Accessory')),
    text('audioFormats','Audio formats / codecs',forDevices('Audio','TV')),
    text('audioConnections','Audio inputs & outputs',{multiline:true,maxLength:600,...forDevices('Audio')})
  ] },
  { label: 'Gaming', fields: [
    text('consolePlatform','Console platform',{essential:true,...forDevices('Console')}),
    number('includedControllers','Included controllers','',{integer:true,max:20,...forDevices('Console')}),
    select('discDrive','Disc drive',electronicChoice,forDevices('Console','Desktop','Laptop')),
    text('gameCompatibility','Game / platform compatibility',{multiline:true,maxLength:800,...forDevices('Console','Accessory')}),
    text('maximumOutputResolution','Maximum output resolution',forDevices('Console')),
    text('includedGames','Included games',{multiline:true,maxLength:800,...forDevices('Console')})
  ] },
  { label: 'Wearables & smart home', fields: [
    select('wearableType','Wearable type',['Smartwatch','Fitness tracker','Smart ring','VR / AR headset','Other'],{essential:true,...forDevices('Wearable')}),
    text('compatibleDevices','Compatible devices',{multiline:true,maxLength:600,...forDevices('Wearable','Accessory','Smart home','Audio')}),
    text('sensors','Sensors',forDevices('Wearable','Smart home','Phone')),
    text('caseSize','Watch case size',forDevices('Wearable')),
    text('bandSize','Band / strap size',forDevices('Wearable')),
    select('smartHomeType','Smart home type',['Lighting','Plug / switch','Camera / doorbell','Hub','Sensor','Lock','Thermostat','Speaker / display','Other'],{essential:true,...forDevices('Smart home')}),
    text('smartHomeProtocol','Smart home protocols',forDevices('Smart home','Networking')),
    select('hubRequired','Hub required',electronicChoice,forDevices('Smart home')),
    text('voiceAssistant','Voice assistant compatibility',forDevices('Smart home','TV','Audio')),
    text('automationFeatures','Automation features',{multiline:true,maxLength:800,...forDevices('Smart home')})
  ] },
  { label: 'Networking', fields: [
    select('networkDeviceType','Networking device type',['Router','Modem','Access point','Mesh system','Switch','Network adapter','Range extender','Other'],{essential:true,...forDevices('Networking')}),
    text('wirelessBands','Wireless bands',forDevices('Networking')),
    number('maximumWirelessSpeed','Maximum advertised wireless speed','Mbps',{max:1000000,...forDevices('Networking')}),
    number('antennaCount','Antenna count','',{integer:true,max:100,...forDevices('Networking')}),
    select('meshSupport','Mesh support',electronicChoice,forDevices('Networking')),
    text('poeSupport','Power over Ethernet',forDevices('Networking','Smart home')),
    number('coverage','Stated coverage','m²',{max:1000000,...forDevices('Networking')}),
    number('networkNodes','Included mesh units','',{integer:true,max:1000,...forDevices('Networking')}),
    text('networkSecurity','Network security standards',forDevices('Networking'))
  ] },
  { label: 'Components & accessories', fields: [
    select('componentType','Component type',['Processor','Graphics card','Memory','Motherboard','Power supply','Cooling','Case','Expansion card','Other'],{essential:true,...forDevices('Component')}),
    text('formFactor','Form factor',forDevices('Component','Storage','Desktop')),
    text('processorSocket','Processor socket',forDevices('Component')),
    text('chipset','Chipset',forDevices('Component')),
    number('tdp','Thermal design power','W',{max:10000,...forDevices('Component')}),
    text('cooling','Cooling system',forDevices('Desktop','Component')),
    text('expansionSlots','Expansion slots',forDevices('Desktop','Component')),
    select('accessoryType','Accessory type',['Keyboard','Mouse','Controller','Cable','Charger','Adapter / dock','Case / cover','Stand / mount','Stylus','Lens','Other'],{essential:true,...forDevices('Accessory')}),
    number('cableLength','Cable length','m',{max:10000,...forDevices('Accessory','Audio')}),
    text('keyboardLayout','Keyboard layout',forDevices('Accessory','Laptop')),
    text('keyboardSwitches','Keyboard switches',forDevices('Accessory')),
    number('mouseSensitivity','Maximum mouse sensitivity','DPI',{max:1000000,...forDevices('Accessory')}),
    number('buttonCount','Programmable buttons','',{integer:true,max:100,...forDevices('Accessory')}),
    text('connectorCompatibility','Connector compatibility',forDevices('Accessory','Component','Storage'))
  ] },
  { label: 'Build & dimensions', fields: [
    number('weight','Weight','g',{max:10000000}),
    number('width','Width','mm',{max:100000}),
    number('height','Height','mm',{max:100000}),
    number('depth','Depth','mm',{max:100000}),
    text('material','Material / build'),
    text('ipRating','IP dust / water rating',forDevices('Phone','Tablet','Audio','Camera','Wearable','Networking','Smart home')),
    text('waterResistance','Water resistance',forDevices('Phone','Tablet','Audio','Camera','Wearable','Smart home'))
  ] }
];
export const getListingType = (product = {}) => getProductTemplate(product.catalogTemplateId)?.listingType || (LISTING_TYPES.some(type => type.id === product.listingType) ? product.listingType : 'physical');
export const isEnquiryListing = (product = {}) => getListingType(product) !== 'electronics' && (['vehicle','equipment'].includes(getListingType(product)) || product.transactionMode === 'enquiry');
export const hasListingSpecifications = () => true;
export const getListingSchema = (product = {}) => ({ vehicle: VEHICLE_SCHEMA, equipment: EQUIPMENT_SCHEMA, electronics: ELECTRONICS_SCHEMA }[getListingType(product)] || PHYSICAL_SCHEMA);
export const listingDetailsKey = (product = {}) => ({ vehicle: 'vehicleDetails', equipment: 'equipmentDetails', electronics: 'electronicsDetails' }[getListingType(product)] || 'physicalDetails');
export function getApplicableListingSchema(product = {}, deviceType = product.electronicsDetails?.deviceType) {
  const schema = getListingSchema(product);
  const type = getListingType(product);
  const template = getProductTemplate(product.catalogTemplateId);
  if (type === 'physical') return productTemplateSchema(product);
  const fixed = template ? { ...(template.detailDefaults || {}), ...(template.deviceType ? { deviceType: template.deviceType } : {}) } : {};
  deviceType = template?.deviceType || deviceType;
  const schemaTemplateId = template?.schemaTemplateId || template?.id;
  const broadEquipmentCategory = template?.categorySetup && type === 'equipment' && !template.schemaTemplateId;
  return schema.map(group => ({ ...group, fields: group.fields.filter(field =>
    (type !== 'electronics' || !field.deviceTypes || field.deviceTypes.includes(deviceType)) &&
    (!template || broadEquipmentCategory || !field.templateIds || field.templateIds.includes(schemaTemplateId)) && productTemplateAllowsField(product, field)
  ).map(field => ({ ...field,
    ...(field.key === 'deviceType' && template?.allowedDeviceTypes ? { options: template.allowedDeviceTypes } : {}),
    ...(field.essentialDeviceTypes ? { essential: field.essentialDeviceTypes.includes(deviceType) } : {}),
    ...(field.essentialTemplateIds ? { essential: field.essentialTemplateIds.includes(schemaTemplateId) } : {}),
    ...(Object.hasOwn(fixed, field.key) ? { templateFixed: true } : {})
  })) })).filter(group => group.fields.length);
}
function allowlistedListingDetails(product, schema) {
  const template = getProductTemplate(product.catalogTemplateId);
  const source = { ...(product[listingDetailsKey(product)] || {}), ...(template?.detailDefaults || {}), ...(template?.deviceType ? { deviceType: template.deviceType } : {}) };
  return Object.fromEntries(schema.flatMap(group => group.fields).flatMap(field => {
    const value = source[field.key];
    return ['string','number'].includes(typeof value) && String(value).trim() ? [[field.key, String(value).trim().slice(0,field.maxLength || 160)]] : [];
  }));
}
export function publicListingDetails(product = {}) {
  return allowlistedListingDetails(product, getApplicableListingSchema(product));
}
export function listingSpecificationGroups(product = {}) {
  const details = publicListingDetails(product);
  return getApplicableListingSchema(product).map(group => ({ label: group.label, fields: group.fields.filter(field => Object.hasOwn(details, field.key)).map(field => ({ key: field.key, label: field.label, unit: field.unit || '', value: details[field.key] })) })).filter(group => group.fields.length);
}
export function normalizeListing(product = {}) {
  const listingType = getListingType(product);
  // Keep approved saved fields when the selected device changes; public views show only applicable fields.
  const details = allowlistedListingDetails(product, getListingSchema(product));
  const selectableKeys = new Set(getListingSchema(product).flatMap(group => group.fields).filter(field => !field.required).map(field => field.key));
  const listingSpecFields = Array.isArray(product.listingSpecFields) ? [...new Set(product.listingSpecFields.filter(key => typeof key === 'string' && selectableKeys.has(key)))] : [];
  return { listingType, transactionMode: isEnquiryListing(product) ? 'enquiry' : 'checkout', listingAvailability: ['available','reserved','sold'].includes(product.listingAvailability) ? product.listingAvailability : 'available',
    catalogTemplateId: getProductTemplate(product.catalogTemplateId)?.id || '', listingSpecFields, physicalDetails: listingType === 'physical' ? details : {}, vehicleDetails: listingType === 'vehicle' ? details : {}, equipmentDetails: listingType === 'equipment' ? details : {}, electronicsDetails: listingType === 'electronics' ? details : {} };
}
export function validateListing(product = {}) {
  if (product.listingType && !LISTING_TYPES.some(type => type.id === product.listingType)) return 'Choose a supported listing type.';
  if (product.transactionMode && !['enquiry','checkout'].includes(product.transactionMode)) return 'Choose a supported transaction mode.';
  const template = getProductTemplate(product.catalogTemplateId);
  if (product.catalogTemplateId != null && product.catalogTemplateId !== '' && (typeof product.catalogTemplateId !== 'string' || !template)) return 'Choose a supported product type.';
  if (template) {
    if (product.listingType && product.listingType !== template.listingType) return 'Choose a product type that matches this listing.';
    if (product.exploreSubcategoryId && !template.categoryIds.includes(product.exploreSubcategoryId)) return 'Choose a product type in this subcategory.';
    if (product.exploreMainCategoryId && !PRODUCT_CATEGORY_GROUPS[product.exploreMainCategoryId]?.includes(product.exploreSubcategoryId)) return 'Choose a matching product category and subcategory.';
    const savedDetails = product[listingDetailsKey(product)] || {};
    const fixed = { ...(template.detailDefaults || {}), ...(template.deviceType ? { deviceType: template.deviceType } : {}) };
    if (Object.entries(fixed).some(([key, value]) => savedDetails[key] != null && String(savedDetails[key]).trim() && String(savedDetails[key]).trim() !== value)) return 'The specifications must match the chosen product type.';
    if (template.allowedDeviceTypes && savedDetails.deviceType && !template.allowedDeviceTypes.includes(savedDetails.deviceType)) return 'Choose a device type in this subcategory.';
  }
  if (isEnquiryListing(product) && product.listingAvailability && !['available','reserved','sold'].includes(product.listingAvailability)) return 'Choose a valid listing availability.';
  const rawSource = product[listingDetailsKey(product)] ?? {};
  if (typeof rawSource !== 'object' || Array.isArray(rawSource)) return 'Enter valid listing specifications.';
  const source = { ...rawSource, ...(template?.detailDefaults || {}), ...(template?.deviceType ? { deviceType: template.deviceType } : {}) };
  for (const field of getListingSchema(product).flatMap(group => group.fields)) {
    const value = source[field.key]; const raw = value == null ? '' : String(value).trim();
    if (field.required && !raw) return `Add ${field.label.toLowerCase()}.`;
    if (!raw) continue;
    if (!['string','number'].includes(typeof value) || raw.length > (field.maxLength || 160)) return `Correct ${field.label.toLowerCase()}.`;
    if (field.options && !field.options.includes(raw)) return `Choose a valid ${field.label.toLowerCase()}.`;
    if (field.type === 'number' && (!/^\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) < field.min || Number(raw) > field.max || field.integer && !Number.isInteger(Number(raw)))) return `Enter a valid ${field.label.toLowerCase()}.`;
  }
  if (isEnquiryListing(product)) {
    if (String(product.price ?? '').trim() && (!/^\d+(?:\.\d{1,2})?$/.test(String(product.price).trim()) || !Number.isSafeInteger(Math.round(Number(product.price)*100)))) return 'Enter a valid asking price or leave it blank.';
    if ((product.options || []).length || (product.variants || []).some(variant => variant.available !== false)) return 'Vehicle and equipment listings use individual records, without product variants.';
  }
  return '';
}
export function listingFacts(product = {}) {
  const details = publicListingDetails(product); const type = getListingType(product);
  if (type === 'vehicle') return [details.year, details.mileage != null ? `${Number(details.mileage).toLocaleString('en-ZA')} km` : '',details.transmission,details.fuel].filter(Boolean);
  if (type === 'equipment') return [details.condition,details.ratedPower ? `${details.ratedPower} kW` : details.year,details.operatingHours ? `${Number(details.operatingHours).toLocaleString('en-ZA')} h` : details.liftingCapacity ? `${details.liftingCapacity} kg lift` : details.fuel].filter(Boolean);
  if (type === 'physical') return productTemplateFacts(product, details);
  if (type === 'electronics') {
    if (['Phone','Tablet','Laptop','Desktop'].includes(details.deviceType)) return [details.ram ? `${details.ram} GB RAM` : '', details.storageCapacity ? `${details.storageCapacity} GB` : '', details.processor].filter(Boolean).slice(0,3);
    if (['Monitor','TV'].includes(details.deviceType)) return [details.displaySize ? `${details.displaySize}″` : '', details.displayResolution, details.refreshRate ? `${details.refreshRate} Hz` : ''].filter(Boolean);
    if (details.deviceType === 'Storage') return [details.storageCapacity ? `${details.storageCapacity} GB` : '', details.storageType, details.storageInterface].filter(Boolean);
    return [details.audioType || details.cameraType || details.wearableType || details.networkDeviceType || details.componentType || details.accessoryType || details.smartHomeType || details.consolePlatform || details.deviceType, details.condition].filter(Boolean);
  }
  return [];
}
export function listingSearchTerms(product = {}) {
  return Object.values(publicListingDetails(product));
}
