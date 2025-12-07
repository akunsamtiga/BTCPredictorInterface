// Firebase initialization for both client and server
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (Server-side only)
function initFirebaseAdmin() {
  try {
    if (getApps().length === 0) {
      // Check if required env vars exist
      if (!process.env.FIREBASE_PROJECT_ID) {
        throw new Error('FIREBASE_PROJECT_ID is not set');
      }
      if (!process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error('FIREBASE_CLIENT_EMAIL is not set');
      }
      if (!process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('FIREBASE_PRIVATE_KEY is not set');
      }

      // Replace escaped newlines in private key
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      console.log('Initializing Firebase Admin...');
      console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
      console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
      console.log('Private Key length:', privateKey.length);
      
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      
      console.log('✅ Firebase Admin initialized successfully');
    }
    
    return getFirestore();
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    throw error;
  }
}

export { initFirebaseAdmin };