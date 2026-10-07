import { useMemo } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image, useImage } from '@shopify/react-native-skia';
import { buildHeatmapImage } from '../utils/heatmapImage';
import { fitBox } from '../utils/fitBox';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_SIZE = Math.min(SCREEN_WIDTH - 48, 340);

function AnalyzedCanvas({
  imageUri,
  grid,
  width,
  height,
}: {
  imageUri: string;
  grid: number[][];
  width: number;
  height: number;
}) {
  const photo = useImage(imageUri);
  const heatmapRes = Math.min(160, Math.round(width));
  const heatmap = useMemo(
    () => buildHeatmapImage(grid, heatmapRes),
    [grid, heatmapRes]
  );

  if (!photo) return null;

  return (
    <Canvas style={{ width, height }}>
      <Image image={photo} x={0} y={0} width={width} height={height} fit="fill" />
      {heatmap && (
        <Image image={heatmap} x={0} y={0} width={width} height={height} fit="fill" />
      )}
    </Canvas>
  );
}

export function StackedComparisonModal({
  visible,
  onClose,
  imageUri,
  imageAspect,
  grid,
}: {
  visible: boolean;
  onClose: () => void;
  imageUri: string | null;
  imageAspect: number;
  grid: number[][] | null;
}) {
  const panel = fitBox(PANEL_SIZE, PANEL_SIZE, imageAspect);
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
              <View style={[styles.imageBox, panel]}>
                <Canvas style={panel}>
                  <OriginalImage imageUri={imageUri} {...panel} />
                </Canvas>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelLabel}>Avec heatmap (zones analysees)</Text>
              <View style={[styles.imageBox, panel]}>
                {grid && (
                  <AnalyzedCanvas imageUri={imageUri} grid={grid} {...panel} />
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function OriginalImage({ imageUri, width, height }: { imageUri: string; width: number; height: number }) {
  const photo = useImage(imageUri);
  if (!photo) return null;
  return <Image image={photo} x={0} y={0} width={width} height={height} fit="fill" />;
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
