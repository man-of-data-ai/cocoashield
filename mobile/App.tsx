import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import { useCamHeatmap } from './src/hooks/useCamHeatmap';
import { BeforeAfterSlider } from './src/components/BeforeAfterSlider';
import { StackedComparisonModal } from './src/components/StackedComparisonModal';
import { ResultCard } from './src/components/ResultCard';
import type { CocoaShieldResult } from './src/hooks/useCamHeatmap';

const IMAGE_BOX_SIZE = Math.min(Dimensions.get('window').width - 40, 360);

export default function App() {
  const { state, analyze } = useCamHeatmap();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<CocoaShieldResult | null>(null);
  const [camGrid, setCamGrid] = useState<number[][] | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [compareVisible, setCompareVisible] = useState(false);

  async function runAnalysis(uri: string) {
    setImageUri(uri);
    setResult(null);
    setCamGrid(null);
    setIsClassifying(true);
    try {
      const { result: r, camGrid: g } = await analyze(uri);
      setResult(r);
      setCamGrid(g);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Echec de l\'analyse');
    } finally {
      setIsClassifying(false);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'acces a la camera est necessaire pour photographier une feuille."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      runAnalysis(result.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "L'acces a la galerie est necessaire pour importer une photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      runAnalysis(result.assets[0].uri);
    }
  }

  const modelReady = state.status === 'ready';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🌱 CocoaShield</Text>
        <Text style={styles.subtitle}>Detection precoce du CSSVD</Text>

        {state.status === 'loading' && (
          <View style={styles.modelStatus}>
            <ActivityIndicator />
            <Text style={styles.modelStatusText}>Chargement des modeles...</Text>
          </View>
        )}
        {state.status === 'error' && (
          <View style={styles.modelStatus}>
            <Text style={styles.errorText}>
              Erreur de chargement du modele : {state.message}
            </Text>
          </View>
        )}

        <View style={[styles.imageBox, { width: IMAGE_BOX_SIZE, height: IMAGE_BOX_SIZE }]}>
          {imageUri && camGrid ? (
            <BeforeAfterSlider imageUri={imageUri} grid={camGrid} size={IMAGE_BOX_SIZE} />
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: IMAGE_BOX_SIZE, height: IMAGE_BOX_SIZE }}
            />
          ) : (
            <Text style={styles.imagePlaceholder}>Aucune photo selectionnee</Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, !modelReady && styles.buttonDisabled]}
            onPress={takePhoto}
            disabled={!modelReady || isClassifying}
          >
            <Text style={styles.buttonText}>📷 Prendre une photo</Text>
          </Pressable>
          <Pressable
            style={[
              styles.button,
              styles.buttonSecondary,
              !modelReady && styles.buttonDisabled,
            ]}
            onPress={pickFromGallery}
            disabled={!modelReady || isClassifying}
          >
            <Text style={styles.buttonText}>🖼️ Depuis la galerie</Text>
          </Pressable>
        </View>

        {isClassifying && (
          <View style={styles.modelStatus}>
            <ActivityIndicator />
            <Text style={styles.modelStatusText}>Analyse en cours...</Text>
          </View>
        )}

        {result && !isClassifying && <ResultCard result={result} />}

        {imageUri && camGrid && !isClassifying && (
          <Pressable
            style={styles.compareButton}
            onPress={() => setCompareVisible(true)}
          >
            <Text style={styles.compareButtonText}>
              🔍 Comparer cote a cote
            </Text>
          </Pressable>
        )}

        <StatusBar style="auto" />
      </ScrollView>

      <StackedComparisonModal
        visible={compareVisible}
        onClose={() => setCompareVisible(false)}
        imageUri={imageUri}
        grid={camGrid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  modelStatusText: {
    color: '#555',
  },
  errorText: {
    color: '#B3261E',
    textAlign: 'center',
  },
  imageBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    color: '#888',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#3B6E8F',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  compareButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EFEFEF',
    borderRadius: 10,
  },
  compareButtonText: {
    fontWeight: '600',
    color: '#333',
    fontSize: 13,
  },
});
