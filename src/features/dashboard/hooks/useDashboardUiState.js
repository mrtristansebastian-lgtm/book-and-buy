import { useEffect, useState } from 'react';

export function useDashboardUiState({ activeTab }) {
  const [themeFilters, setThemeFilters] = useState({ palette: '', industry: '', style: 'all-styles' });
  const [editorColourCategoryId, setEditorColourCategoryId] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileNotificationFilter, setProfileNotificationFilter] = useState('all');
  const [profileSystemFilter, setProfileSystemFilter] = useState('all');
  const [selectedStaffFileId, setSelectedStaffFileId] = useState(null);
  const [teamPanelMode, setTeamPanelMode] = useState('roster');
  const [activeProfileSection, setActiveProfileSection] = useState('');
  const [showOwnerManual, setShowOwnerManual] = useState(false);
  const [editorLaunchPanel, setEditorLaunchPanel] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [supportThreadFocus, setSupportThreadFocus] = useState(null);
  const [legalPanel, setLegalPanel] = useState(null);

  useEffect(() => {
    if (activeTab !== 'profile') setActiveProfileSection('');
    setMobileNavOpen(false);
  }, [activeTab]);

  return {
    activeProfileSection,
    confirmDialog,
    editorColourCategoryId,
    editorLaunchPanel,
    legalPanel,
    mobileNavOpen,
    profileNotificationFilter,
    profileSystemFilter,
    selectedStaffFileId,
    setActiveProfileSection,
    setConfirmDialog,
    setEditorColourCategoryId,
    setEditorLaunchPanel,
    setLegalPanel,
    setMobileNavOpen,
    setProfileSystemFilter,
    setSelectedStaffFileId,
    setShowOwnerManual,
    setSidebarCollapsed,
    setSupportThreadFocus,
    setTeamPanelMode,
    setThemeFilters,
    showOwnerManual,
    sidebarCollapsed,
    supportThreadFocus,
    teamPanelMode,
    themeFilters
  };
}
