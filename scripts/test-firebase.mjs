// Checks the Firestore connection: writes a test game result, reads it back, then deletes it.
// Run: npm run test:firebase
import { initializeApp } from 'firebase/app';
import { addDoc, collection, deleteDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/firebaseConfig.js';

const db = getFirestore(initializeApp(firebaseConfig));
const deviceId = `test-script-${Date.now()}`;

try {
  const ref = await addDoc(collection(db, 'gameHistory'), {
    deviceId,
    playerName: 'Test',
    won: true,
    placement: 1,
    playerCount: 2,
    rounds: 1,
    winnerName: 'Test',
    yourScore: 0,
    scores: [],
    playedAt: Date.now(),
  });
  console.log('✓ wrote test record', ref.id);

  const snap = await getDocs(query(collection(db, 'gameHistory'), where('deviceId', '==', deviceId)));
  console.log(`✓ read back ${snap.size} record(s)`);

  try {
    await deleteDoc(ref);
    console.log('✓ deleted test record');
  } catch {
    // Expected once firestore.rules is published: game records can't be deleted.
    console.log(`(test record ${ref.id} kept: the security rules block deletes)`);
  }
  console.log('Firestore is working.');
  process.exit(0);
} catch (e) {
  console.error('✗ Firestore test failed:', e.code ?? '', e.message);
  process.exit(1);
}
