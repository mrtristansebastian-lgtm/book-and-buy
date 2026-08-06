/**
 * Cloud Functions scaffold — wire callables to Firebase when the project is reattached.
 */
import { initializeApp } from 'firebase-admin/app';
import { getPublicPaymentOptions, savePaymentGatewaySettings } from './payments/index.js';
import { createPublicProductOrder } from './orders.js';
import { buildPublicAvailability } from './availability.js';

initializeApp();

export const health = async () => ({ ok: true, app: 'book-and-buy' });

export {
  getPublicPaymentOptions,
  savePaymentGatewaySettings,
  createPublicProductOrder,
  buildPublicAvailability
};
