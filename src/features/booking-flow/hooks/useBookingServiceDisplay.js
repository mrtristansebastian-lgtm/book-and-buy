import { useEffect, useMemo, useState } from 'react';
import { normalizeServiceList } from '../../../utils/services';
import { previewServiceSamples } from '../config/bookingFlowConfig';
import { getServiceCategoryDisplayMode } from '../utils/bookingFlowUtils';

export function useBookingServiceDisplay({ isPreview, nativePrecisionHeroLayout, settings }) {
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState('All');
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  const activeServices = useMemo(
    () => normalizeServiceList(settings.services || []).filter(service => service.active !== false),
    [settings.services]
  );
  const showServiceStep = activeServices.length > 0 || isPreview;
  const selectedService = activeServices.find(service => service.id === selectedServiceId) || activeServices[0] || null;
  const serviceDisplayStyle = getServiceCategoryDisplayMode({
    defaultMode: nativePrecisionHeroLayout?.serviceDropdownEnabled === false ? 'rail' : 'dropdown',
    serviceDisplayStyle: settings.serviceDisplayStyle || nativePrecisionHeroLayout?.serviceDisplayStyle,
    serviceDropdownEnabled: settings.serviceDropdownEnabled
  });
  const serviceDropdownEnabled = serviceDisplayStyle === 'dropdown';

  useEffect(() => {
    if (!serviceDropdownEnabled) setServicesDropdownOpen(false);
  }, [serviceDropdownEnabled]);

  const serviceCategories = useMemo(() => {
    const categories = activeServices.map(service => service.category?.trim()).filter(Boolean);
    return ['All', ...Array.from(new Set(categories))];
  }, [activeServices]);

  useEffect(() => {
    if (!serviceCategories.includes(selectedServiceCategory)) {
      setSelectedServiceCategory('All');
    }
  }, [selectedServiceCategory, serviceCategories]);

  useEffect(() => {
    if (!activeServices.length) {
      setSelectedServiceId('');
      return;
    }
    if (!activeServices.some(service => service.id === selectedServiceId)) {
      setSelectedServiceId(activeServices[0].id);
    }
  }, [activeServices, selectedServiceId]);

  const servicesForDisplay = selectedServiceCategory !== 'All'
    ? activeServices.filter(service => service.category?.trim() === selectedServiceCategory)
    : activeServices;
  const serviceCardsForDisplay = servicesForDisplay.length > 0
    ? servicesForDisplay
    : (isPreview ? previewServiceSamples : []);
  const selectedServiceForSummary = selectedService || (isPreview ? serviceCardsForDisplay[0] : null);

  return {
    activeServices,
    selectedService,
    selectedServiceCategory,
    selectedServiceForSummary,
    serviceCardsForDisplay,
    serviceCategories,
    serviceDisplayStyle,
    serviceDropdownEnabled,
    servicesDropdownOpen,
    setSelectedServiceCategory,
    setSelectedServiceId,
    setServicesDropdownOpen,
    showServiceStep
  };
}
