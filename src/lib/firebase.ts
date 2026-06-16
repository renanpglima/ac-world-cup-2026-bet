import {initializeApp} from 'firebase/app';
import {getAuth, signInAnonymously} from 'firebase/auth';
import {getDatabase} from 'firebase/database';

// Public web config — security comes from the Realtime Database rules and the
// authorized domains, not from hiding these values.
const firebaseConfig = {
	apiKey: 'AIzaSyAtJldVIYjQKRBUaepI1wQE0-u2nq4InxU',
	appId: '1:797211677840:web:61a5322b748fb4978fb415',
	authDomain: 'ac-world-cup-2026-bet.firebaseapp.com',
	databaseURL: 'https://ac-world-cup-2026-bet-default-rtdb.firebaseio.com',
	messagingSenderId: '797211677840',
	projectId: 'ac-world-cup-2026-bet',
	storageBucket: 'ac-world-cup-2026-bet.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

// No login screen: each browser gets a stable anonymous uid.
export const signedIn = signInAnonymously(auth);
