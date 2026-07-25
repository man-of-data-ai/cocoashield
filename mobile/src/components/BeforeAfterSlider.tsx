import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Canvas, Group, Image, useImage } from '@shopify/react-native-skia';
import { buildHeatmapImage } from '../utils/heatmapImage';

export function BeforeAfterSlider({
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

  // sliderX = position du curseur, en pixels depuis la gauche. A droite du curseur : image
  // originale seule. A gauche : image + heatmap.
  const [sliderX, setSliderX] = useState(size / 2);
  const dragStart = useRef(size / 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = sliderX;
      },
      onPanResponderMove: (_evt, gestureState) => {
        const next = Math.max(
          0,
          Math.min(size, dragStart.current + gestureState.dx)
        );
        setSliderX(next);
      },
    })
  ).current;

  if (!photo) return null;

  return (
    <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
      <Canvas style={{ width: size, height: size }}>
        {/* Image originale, toujours visible en dessous (partie droite du curseur). */}
        <Image image={photo} x={0} y={0} width={size} height={size} fit="cover" />

        {/* Image + heatmap, revelee uniquement a gauche du curseur. */}
        <Group clip={{ x: 0, y: 0, width: sliderX, height: size }}>
          <Image image={photo} x={0} y={0} width={size} height={size} fit="cover" />
          {heatmap && (
            <Image image={heatmap} x={0} y={0} width={size} height={size} fit="fill" />
          )}
        </Group>
      </Canvas>

      {/* Ligne + poignee du curseur. */}
      <View pointerEvents="none" style={[styles.handleLine, { left: sliderX - 1 }]} />
      <View
        pointerEvents="none"
        style={[styles.handle, { left: sliderX - 16, top: size / 2 - 16 }]}
      >
        <View style={styles.handleDotLeft} />
        <View style={styles.handleDotRight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  handleLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#fff',
  },
  handle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  handleDotLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#555',
    marginRight: 2,
  },
  handleDotRight: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#555',
    marginLeft: 2,
  },
});
