import { StyleSheet, Text, View } from 'react-native';
import type { CocoaShieldResult } from '../hooks/useCamHeatmap';

export function ResultCard({ result }: { result: CocoaShieldResult }) {
  const isHealthy = result.label === 'Healthy';
  const pct = Math.round(result.confidence * 100);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isHealthy ? '#E6F4EA' : '#FBE7E7' },
      ]}
    >
      <Text style={styles.emoji}>{isHealthy ? '✅' : '⚠️'}</Text>
      <Text style={[styles.label, { color: isHealthy ? '#1E7B34' : '#B3261E' }]}>
        {isHealthy ? 'Feuille saine' : 'CSSVD detecte'}
      </Text>
      <Text style={styles.confidence}>Confiance : {pct}%</Text>
      {!isHealthy && (
        <Text style={styles.warning}>
          Signes de Swollen Shoot detectes. Consultez un agent agricole pour
          confirmation et traitement.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  emoji: {
    fontSize: 40,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  confidence: {
    fontSize: 16,
    color: '#444',
    marginTop: 4,
  },
  warning: {
    fontSize: 13,
    color: '#7A1F1A',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
