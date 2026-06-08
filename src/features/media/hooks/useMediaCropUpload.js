import { useRef, useState } from 'react';

import * as FirebaseSDK from '../../../services/firebase';
import { appId, isFirebaseConfigured, storage } from '../../../services/firebase';
import { buildCroppedImageFile } from '../../../utils/imageCrop';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (event) => resolve(event.target.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const getSettingImageMeta = (key) => {
  const meta = {
    logo: {
      ratioKey: 'square',
      shape: 'square',
      uploadTitle: 'Crop business logo',
      cropTitle: 'Adjust logo crop',
      fileName: 'business-logo.png',
      preserveTransparency: true,
      emptyMessage: 'Upload a logo in Business Profile first.',
      updatedMessage: 'Logo updated',
      croppedMessage: 'Logo crop updated'
    },
    bannerImage: {
      ratioKey: 'banner',
      shape: 'rounded',
      uploadTitle: 'Crop booking banner',
      cropTitle: 'Adjust banner crop',
      fileName: 'booking-banner.png',
      preserveTransparency: true,
      emptyMessage: 'Upload a banner in Business Profile first.',
      updatedMessage: 'Banner image updated',
      croppedMessage: 'Banner crop updated'
    }
  };
  return meta[key] || meta.logo;
};

export function useMediaCropUpload({
  handleSettingChange,
  persistProfileChanges,
  personalProfile,
  saveWorkspaceSettingsPatch,
  settings,
  settingsRef,
  showToast,
  updatePersonalProfile,
  user,
  workspaceOwnerId
}) {
  const [imageCropModal, setImageCropModal] = useState(null);
  const [imageCropSaving, setImageCropSaving] = useState(false);
  const imageCropCommitRef = useRef(null);

  const uploadAsset = async (file, folder) => {
    if (!file) return '';
    if (!isFirebaseConfigured || !user || !storage) return readFileAsDataUrl(file);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
    const assetRef = FirebaseSDK.ref(storage, `artifacts/${appId}/users/${workspaceOwnerId || user.uid}/${folder}/${Date.now()}-${safeName || 'asset'}`);
    await FirebaseSDK.uploadBytes(assetRef, file);
    return FirebaseSDK.getDownloadURL(assetRef);
  };

  const saveMediaSettingsPatch = async (patch, message) => {
    if (saveWorkspaceSettingsPatch) {
      return saveWorkspaceSettingsPatch(patch, message);
    }
    Object.entries(patch || {}).forEach(([key, value]) => handleSettingChange(key, value));
    showToast(message);
    return true;
  };

  const deleteStorageAsset = async (url) => {
    if (!url || !isFirebaseConfigured || !storage || !FirebaseSDK.deleteObject) return;
    if (!String(url).startsWith('http')) return;
    try {
      await FirebaseSDK.deleteObject(FirebaseSDK.ref(storage, url));
    } catch (error) {
      console.warn('Storage asset delete skipped.', error);
    }
  };

  const requestImageCropUpload = async (file, options = {}, onComplete) => {
    if (!file) return;
    try {
      const source = await readFileAsDataUrl(file);
      imageCropCommitRef.current = {
        folder: options.folder || 'uploads',
        onComplete
      };
      setImageCropModal({
        source,
        fileName: file.name || 'image.jpg',
        title: options.title || 'Crop image',
        ratioKey: options.ratioKey || 'square',
        shape: options.shape || 'rounded',
        preserveTransparency: Boolean(options.preserveTransparency),
        zoom: 1,
        positionX: 50,
        positionY: 50
      });
    } catch (error) {
      console.error(error);
      showToast('Image could not be opened.');
    }
  };

  const handleImageCropSave = async () => {
    if (!imageCropModal || !imageCropCommitRef.current) return;
    setImageCropSaving(true);
    try {
      const croppedFile = await buildCroppedImageFile(imageCropModal);
      const { folder, onComplete } = imageCropCommitRef.current;
      const url = await uploadAsset(croppedFile, folder);
      setImageCropModal(null);
      imageCropCommitRef.current = null;
      const completionMessage = await onComplete?.(url, croppedFile);
      if (completionMessage !== false) {
        showToast(typeof completionMessage === 'string' ? completionMessage : 'Image saved.');
      }
    } catch (error) {
      console.error(error);
      showToast('Image crop could not be saved.');
    } finally {
      setImageCropSaving(false);
    }
  };

  const handlePersonalProfilePhotoUpload = async (file) => {
    if (!file) return;
    const previousPhoto = personalProfile.photoURL || '';
    requestImageCropUpload(file, {
      folder: 'account-avatars',
      title: 'Crop profile photo',
      ratioKey: 'square',
      shape: 'circle'
    }, async (url) => {
      if (previousPhoto && previousPhoto !== url) await deleteStorageAsset(previousPhoto);
      const { nextProfile, nextSettings, nextStaffList } = updatePersonalProfile({ photoURL: url });
      await persistProfileChanges(nextProfile, nextSettings, nextStaffList, 'Profile photo saved.');
      return false;
    });
  };

  const removePersonalProfilePhoto = async () => {
    const previousPhoto = personalProfile.photoURL || '';
    const { nextProfile, nextSettings, nextStaffList } = updatePersonalProfile({ photoURL: '' });
    await deleteStorageAsset(previousPhoto);
    await persistProfileChanges(nextProfile, nextSettings, nextStaffList, 'Profile photo removed.');
  };

  const handleSettingImageUpload = async (key, file, folder) => {
    if (!file) return;
    const imageMeta = getSettingImageMeta(key);
    const previousUrl = settingsRef.current?.[key] || '';
    requestImageCropUpload(file, {
      folder,
      title: imageMeta.uploadTitle,
      ratioKey: imageMeta.ratioKey,
      shape: imageMeta.shape,
      preserveTransparency: imageMeta.preserveTransparency
    }, async (url) => {
      const saved = await saveMediaSettingsPatch({ [key]: url }, imageMeta.updatedMessage);
      if (saved && previousUrl && previousUrl !== url) await deleteStorageAsset(previousUrl);
      if (!saved) await deleteStorageAsset(url);
      return false;
    });
  };

  const removeSettingImage = async (key) => {
    const previousUrl = settingsRef.current?.[key] || '';
    const saved = await saveMediaSettingsPatch({ [key]: '' }, 'Image removed');
    if (saved) await deleteStorageAsset(previousUrl);
  };

  const openSettingImageCrop = (key, folder) => {
    const imageMeta = getSettingImageMeta(key);
    const currentUrl = settingsRef.current?.[key] || settings[key] || '';
    if (!currentUrl) {
      showToast(imageMeta.emptyMessage);
      return;
    }
    imageCropCommitRef.current = {
      folder,
      onComplete: async (url) => {
        const saved = await saveMediaSettingsPatch({ [key]: url }, imageMeta.croppedMessage);
        if (saved && currentUrl && currentUrl !== url) await deleteStorageAsset(currentUrl);
        if (!saved) await deleteStorageAsset(url);
        return false;
      }
    };
    setImageCropModal({
      source: currentUrl,
      fileName: imageMeta.fileName,
      title: imageMeta.cropTitle,
      ratioKey: imageMeta.ratioKey,
      shape: imageMeta.shape,
      preserveTransparency: imageMeta.preserveTransparency,
      zoom: 1,
      positionX: 50,
      positionY: 50
    });
  };

  const handleVenuePhotoUpload = async (files) => {
    const photoFiles = Array.from(files || []).filter(Boolean).slice(0, 8);
    if (!photoFiles.length) return;
    let pendingPhotos = Array.isArray(settingsRef.current.venuePhotos)
      ? settingsRef.current.venuePhotos.filter(Boolean)
      : [];
    const openVenueCrop = (index = 0) => {
      const file = photoFiles[index];
      if (!file) return;
      requestImageCropUpload(file, {
        folder: 'venue',
        title: photoFiles.length > 1 ? `Crop venue photo ${index + 1}` : 'Crop venue photo',
        ratioKey: 'gallery'
      }, async (url) => {
        pendingPhotos = [...pendingPhotos, url].filter(Boolean).slice(0, 12);
        const isLastPhoto = index + 1 >= photoFiles.length;
        const saved = await saveMediaSettingsPatch(
          { venuePhotos: pendingPhotos },
          isLastPhoto
            ? (photoFiles.length > 1 ? 'Venue photos added' : 'Venue photo added')
            : `Venue photo ${index + 1} added`
        );
        if (!saved) {
          pendingPhotos = pendingPhotos.filter(photo => photo !== url);
          await deleteStorageAsset(url);
          return false;
        }
        if (!isLastPhoto) {
          window.setTimeout(() => openVenueCrop(index + 1), 150);
        }
        return false;
      });
    };
    openVenueCrop();
  };

  const removeVenuePhoto = async (photoUrl) => {
    const currentPhotos = Array.isArray(settingsRef.current.venuePhotos) ? settingsRef.current.venuePhotos : [];
    const saved = await saveMediaSettingsPatch({
      venuePhotos: currentPhotos.filter(photo => photo !== photoUrl)
    }, 'Venue photo removed');
    if (saved) await deleteStorageAsset(photoUrl);
  };

  return {
    deleteStorageAsset,
    handleImageCropSave,
    handlePersonalProfilePhotoUpload,
    handleSettingImageUpload,
    handleVenuePhotoUpload,
    imageCropCommitRef,
    imageCropModal,
    imageCropSaving,
    openSettingImageCrop,
    removePersonalProfilePhoto,
    removeSettingImage,
    removeVenuePhoto,
    requestImageCropUpload,
    setImageCropModal
  };
}
