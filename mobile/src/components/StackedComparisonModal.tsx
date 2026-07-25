import { useMemo } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image, useImage } from '@shopify/react-native-skia';
import { buildHeatmapImage } from '../utils/heatmapImage';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_SIZE = Math.min(SCREEN_WIDTH - 48, 340);

function AnalyzedCanvas({
  imageUri,
  grid,
  size,
}: {
  imageUri: string;
  grid: number[][];
  size: number;
}) {
  const photo = useImage(imageUri);
  const heatmapRes = Math.min(160, Math.round(size));
  const heatmap = useMemo(
    () => buildHeatmapImage(grid, heatmapRes),
    [grid, heatmapRes]
  );

  if (!photo) return null;

  return (
    <Canvas style={{ width: size, height: size }}>
      <Image image={photo} x={0} y={0} width={size} height={size} fit="cover" />
      {heatmap && (
        <Image image={heatmap} x={0} y={0} width={size} height={size} fit="fill" />
      )}
    </Canvas>
  );
}

export function StackedComparisonModal({
  visible,
  onClose,
  imageUri,
  grid,
}: {
  visible: boolean;
  onClose: () => void;
  imageUri: string | null;
  grid: number[][] | null;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Comparaison</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Fermer</Text>
          </Pressable>
        </View>

        {imageUri && (
          <View style={styles.panelsContainer}>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Photo originale</Text>
              <View style={[styles.imageBox, { width: PANEL_SIZE, height: PANEL_SIZE }]}>
                <Canvas style={{ width: PANEL_SIZE, height: PANEL_SIZE }}>
                  <OriginalImage imageUri={imageUri} size={PANEL_SIZE} />
                </Canvas>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Avec heatmap (zones analysees)</Text>
              <View style={[styles.imageBox, { width: PANEL_SIZE, height: PANEL_SIZE }]}>
                {grid && (
                  <AnalyzedCanvas imageUri={imageUri} grid={grid} size={PANEL_SIZE} />
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function OriginalImage({ imageUri, size }: { imageUri: string; size: number }) {
  const photo = useImage(imageUri);
  if (!photo) return null;
  return <Image image={photo} x={0} y={0} width={size} height={size} fit="cover" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F7',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EAEAEA',
    borderRadius: 8,
  },
  closeButtonText: {
    fontWeight: '600',
    color: '#333',
  },
  panelsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  panel: {
    alignItems: 'center',
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  imageBox: {
    backgroundColor: '#EAEAEA',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
