// Bonus: lists past games loaded from Firestore (or the on-device fallback).
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getGameHistory } from '../services/historyService';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppButton } from '../components/AppButton';
import { colors, radius } from '../theme';

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`;

function formatDate(ms) {
  const d = new Date(ms);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [source, setSource] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getGameHistory();
      setItems(res.items);
      setSource(res.source);
      setError(res.error ?? null);
    } catch (e) {
      setError(e?.message ?? 'Could not load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wins = items.filter((g) => g.won).length;
  const best = items.length ? Math.min(...items.map((g) => g.yourScore ?? Infinity)) : null;

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 50)} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={[styles.result, { color: item.won ? colors.teal : colors.danger }]}>{item.won ? 'WON' : 'LOST'}</Text>
        <Text style={styles.date}>{formatDate(item.playedAt)}</Text>
      </View>
      <Text style={styles.line}>
        {ordinal(item.placement)} of {item.playerCount} · {item.rounds} round{item.rounds === 1 ? '' : 's'} · Winner: {item.winnerName}
      </Text>
      <View style={styles.scores}>
        {(item.scores ?? []).map((s) => (
          <View key={s.name} style={[styles.scorePill, s.isHuman && styles.mePill]}>
            <Text style={[styles.scoreName, s.eliminated && styles.struck]}>{s.name}</Text>
            <Text style={styles.scoreVal}>{s.score}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Score history" onBack={() => router.back()} />

      {loading ? (
        <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(g) => String(g.id ?? g.playedAt)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
          ListHeaderComponent={
            <>
              <View style={styles.stats}>
                <Stat label="Games" value={items.length} />
                <Stat label="Wins" value={wins} />
                <Stat label="Win rate" value={items.length ? `${Math.round((wins / items.length) * 100)}%` : '–'} />
                <Stat label="Best score" value={best ?? '–'} />
              </View>
              <Text style={styles.source}>
                {source === 'firebase' ? '☁ Synced with Firebase Firestore' : '📱 Stored on this device (Firebase not configured)'}
              </Text>
              {error && <Text style={styles.error}>Couldn't reach Firebase: {error}</Text>}
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyText}>Finish a game and it will show up here.</Text>
              <AppButton title="Play now" onPress={() => router.replace('/setup')} style={{ marginTop: 16 }} />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingTop: 4 },
  stats: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  source: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 12 },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  result: { fontWeight: '900', letterSpacing: 2 },
  date: { color: colors.textMuted, fontSize: 12 },
  line: { color: colors.text, marginTop: 6, fontSize: 13 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  scorePill: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  mePill: { borderWidth: 1, borderColor: colors.accent },
  scoreName: { color: colors.textMuted, fontSize: 12, marginRight: 6 },
  struck: { textDecorationLine: 'line-through' },
  scoreVal: { color: colors.text, fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  emptyText: { color: colors.textMuted, marginTop: 6 },
});
