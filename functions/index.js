/**
 * Cloud Functions scaffold — booking, product orders, and payments rebuild in later phases.
 * Keep region and data model compatible with the existing Firebase project.
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export const health = async () => ({ ok: true, app: 'book-and-buy' });
