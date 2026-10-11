/** Physical retail specifications share stock, options and checkout contracts. */
export function retailSpecificationFields(text, number, select) {
  const essential = { essential: true };
  const features = () => text('features', 'Features', { multiline: true, maxLength: 1200 });
  const model = () => text('model', 'Model / range', essential);
  const power = () => number('ratedPowerW', 'Rated power', 'W', { max: 100000 });
  const voltage = () => number('voltage', 'Voltage', 'V', { max: 1000 });
  const size = () => text('size', 'Size', essential);
  const compatibility = () => text('compatibility', 'Compatibility / fit', { multiline: true, maxLength: 1000 });
  return {
    appliance: [model(), text('applianceCapacity', 'Capacity', essential), power(), voltage(), text('energyRating', 'Energy rating'), text('installation', 'Installation / connection requirements', { multiline: true, maxLength: 1000 }), features()],
    toy: [text('ageRange', 'Recommended age range', essential), size(), number('playerCount', 'Players', '', { integer: true, min: 1, max: 100 }), number('playTimeMinutes', 'Typical play time', 'min', { max: 10000 }), text('learningFocus', 'Learning / play focus'), text('warnings', 'Product warnings', { multiline: true, maxLength: 1200 }), features()],
    baby: [text('ageRange', 'Suitable age range', essential), size(), number('maxLoadKg', 'Maximum supported weight', 'kg', { max: 1000 }), compatibility(), text('fastening', 'Fastening / adjustment'), text('assembly', 'Assembly'), text('warnings', 'Product warnings', { multiline: true, maxLength: 1200 }), features()],
    garden: [text('gardenUse', 'Intended use', essential), size(), text('coverage', 'Coverage / reach'), number('volume', 'Capacity', 'L', { max: 100000 }), compatibility(), text('weatherResistance', 'Weather resistance'), features()],
    automotive: [text('compatibleVehicles', 'Compatible vehicles', essential), text('partNumber', 'Part / model number'), text('fitment', 'Fitment / installation'), text('position', 'Fitting position'), text('tyreSize', 'Tyre size'), text('loadIndex', 'Load index'), text('speedRating', 'Speed rating'), text('netContent', 'Net contents'), features()],
    household: [text('netContent', 'Net contents / pack size', essential), text('usageInstructions', 'Intended use / instructions', { essential: true, multiline: true, maxLength: 1200 }), text('dilution', 'Dilution / dosage'), text('scent', 'Scent'), text('storageInstructions', 'Storage instructions', { multiline: true, maxLength: 600 }), text('warnings', 'Product warnings', { multiline: true, maxLength: 1200 }), features()],
    instrument: [text('instrumentType', 'Instrument / accessory type', essential), size(), text('skillLevel', 'Suitable experience level'), text('tuning', 'Tuning / range'), number('keyCount', 'Number of keys', '', { integer: true, min: 1, max: 200 }), text('connections', 'Connections'), text('powerSupply', 'Power supply'), compatibility(), features()],
    tool: [text('toolType', 'Tool / supply type', essential), size(), model(), power(), voltage(), compatibility(), features()],
    personalCare: [text('netContent', 'Net contents / pack size', essential), text('intendedUse', 'Intended use', essential), text('usageInstructions', 'How to use', { multiline: true, maxLength: 1200 }), text('ingredients', 'Ingredients', { multiline: true, maxLength: 1600 }), text('warnings', 'Product warnings', { multiline: true, maxLength: 1200 }), features()],
    office: [size(), compatibility(), number('paperWeight', 'Paper weight', 'gsm', { max: 5000 }), text('paperType', 'Paper type / finish'), text('inkType', 'Ink / toner type'), text('features', 'Features', { multiline: true, maxLength: 1200 })],
    officeDevice: [model(), text('printTechnology', 'Print / scan technology', essential), text('paperSizes', 'Supported paper sizes'), number('printSpeedPpm', 'Print speed', 'pages/min', { max: 1000 }), select('duplex', 'Automatic double-sided printing', ['Yes', 'No']), text('connections', 'Connections'), compatibility(), features()],
    craft: [text('craftType', 'Art / craft type', essential), size(), text('medium', 'Medium / composition'), compatibility(), features()],
    power: [model(), number('batteryCapacityWh', 'Battery capacity', 'Wh', { essential: true, max: 100000 }), power(), text('outputPorts', 'Outputs / ports', essential), text('chargingInputs', 'Charging inputs'), number('chargingTimeHours', 'Stated charging time', 'h', { max: 1000 }), text('batteryChemistry', 'Battery chemistry'), features()]
  };
}

export const RETAIL_FACT_KEYS = Object.freeze({
  appliance: ['model', 'applianceCapacity', 'ratedPowerW'], toy: ['ageRange', 'size', 'playerCount'],
  baby: ['ageRange', 'size', 'maxLoadKg'], garden: ['gardenUse', 'size', 'coverage'],
  automotive: ['compatibleVehicles', 'partNumber', 'tyreSize'], household: ['netContent', 'scent'],
  instrument: ['instrumentType', 'size', 'skillLevel'], tool: ['toolType', 'size', 'ratedPowerW'],
  personalCare: ['netContent', 'intendedUse'], office: ['size', 'inkType', 'paperWeight'],
  officeDevice: ['printTechnology', 'paperSizes', 'printSpeedPpm'], power: ['batteryCapacityWh', 'ratedPowerW', 'outputPorts'],
  craft: ['craftType', 'size', 'medium']
});
export const RETAIL_FACT_UNITS = Object.freeze({ ratedPowerW: 'W', batteryCapacityWh: 'Wh', maxLoadKg: 'kg', paperWeight: 'gsm', printSpeedPpm: 'pages/min' });
