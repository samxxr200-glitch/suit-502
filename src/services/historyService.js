// Saves and loads finished-game results.
// Primary store: Firestore collection "gameHistory". Fallback: AsyncStorage on the device.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/firebase';

const COLLECTION = 'gameHistory';
const LOCAL_KEY = 'suit502:history';
const DEVICE_KEY = 'suit502:deviceId';
const TIMEOUT_MS = 8000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))]);
}

/** A random id kept on the device so each phone only sees its own games. */
export async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

async function readLocal() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveLocal(record) {
  const list = await readLocal();
  list.unshift({ ...record, id: `local-${record.playedAt}` });
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 200)));
}

/** Turns the final game state into a small, storable summary. */
export function buildResult(state) {
  const ranking = [...state.players].sort((a, b) =>
    a.eliminated === b.eliminated ? a.score - b.score : a.eliminated ? 1 : -1
  );
  const champion = state.players[state.championIndex];
  return {
    playerName: state.players[0].name,
    won: state.championIndex === 0,
    placement: ranking.findIndex((p) => p.isHuman) + 1,
    playerCount: state.players.length,
    rounds: state.round,
    winnerName: champion.name,
    yourScore: state.players[0].score,
    scores: state.players.map((p) => ({ name: p.name, score: p.score, eliminated: p.eliminated, isHuman: p.isHuman })),
  };
}

/** @returns {Promise<'firebase' | 'local'>} where the record ended up */
export async function saveGameResult(result) {
  const record = { ...result, deviceId: await getDeviceId(), playedAt: Date.now() };
  if (isFirebaseConfigured && db) {
    try {
      await withTimeout(addDoc(collection(db, COLLECTION), { ...record, createdAt: serverTimestamp() }));
      return 'firebase';
    } catch (e) {
      console.warn('Firestore save failed, keeping result on device:', e?.message);
    }
  }
  await saveLocal(record);
  return 'local';
}

/** @returns {Promise<{ items: object[], source: 'firebase'|'local', error?: string }>} newest first */
export async function getGameHistory() {
  const local = await readLocal();
  if (!isFirebaseConfigured || !db) return { items: local, source: 'local' };

  try {
    const deviceId = await getDeviceId();
    // Single-field filter only → no composite index needed; sort on the client.
    const snap = await withTimeout(getDocs(query(collection(db, COLLECTION), where('deviceId', '==', deviceId))));
    const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const items = [...remote, ...local].sort((a, b) => b.playedAt - a.playedAt);
    return { items, source: 'firebase' };
  } catch (e) {
    return { items: local, source: 'local', error: e?.message ?? 'Could not reach Firebase' };
  }
}
