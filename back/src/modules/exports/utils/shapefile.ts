import { createZip } from './archive';

type ShapeFeature = {
  coordinates: number[][];
  properties: Record<string, string | number>;
};

function bounds(features: ShapeFeature[]) {
  const coords = features.flatMap((feature) => feature.coordinates);
  return {
    minX: Math.min(...coords.map(([x]) => x)),
    minY: Math.min(...coords.map(([, y]) => y)),
    maxX: Math.max(...coords.map(([x]) => x)),
    maxY: Math.max(...coords.map(([, y]) => y)),
  };
}

function writeHeader(buffer: Buffer, fileLengthWords: number, box: ReturnType<typeof bounds>) {
  buffer.writeInt32BE(9994, 0);
  buffer.writeInt32BE(fileLengthWords, 24);
  buffer.writeInt32LE(1000, 28);
  buffer.writeInt32LE(5, 32);
  buffer.writeDoubleLE(box.minX, 36);
  buffer.writeDoubleLE(box.minY, 44);
  buffer.writeDoubleLE(box.maxX, 52);
  buffer.writeDoubleLE(box.maxY, 60);
  buffer.writeDoubleLE(0, 68);
  buffer.writeDoubleLE(0, 76);
  buffer.writeDoubleLE(0, 84);
  buffer.writeDoubleLE(0, 92);
}

function recordContent(feature: ShapeFeature): Buffer {
  const points = feature.coordinates;
  const box = bounds([feature]);
  const content = Buffer.alloc(48 + points.length * 16);
  content.writeInt32LE(5, 0);
  content.writeDoubleLE(box.minX, 4);
  content.writeDoubleLE(box.minY, 12);
  content.writeDoubleLE(box.maxX, 20);
  content.writeDoubleLE(box.maxY, 28);
  content.writeInt32LE(1, 36);
  content.writeInt32LE(points.length, 40);
  content.writeInt32LE(0, 44);
  points.forEach(([x, y], index) => {
    content.writeDoubleLE(x, 48 + index * 16);
    content.writeDoubleLE(y, 56 + index * 16);
  });
  return content;
}

function dbf(features: ShapeFeature[]): Buffer {
  const fields = [
    ['PARCEL_ID', 'C', 36, 0],
    ['NAME', 'C', 60, 0],
    ['STATUS', 'C', 20, 0],
    ['VERIFIED', 'C', 16, 0],
    ['AREA_HA', 'N', 14, 4],
    ['INF_RATE', 'N', 10, 2],
    ['IMAGES', 'N', 10, 0],
    ['INFECTED', 'N', 10, 0],
    ['MISSIONS', 'C', 100, 0],
  ] as const;
  const headerLength = 32 + fields.length * 32 + 1;
  const recordLength = 1 + fields.reduce((sum, field) => sum + field[2], 0);
  const buffer = Buffer.alloc(headerLength + recordLength * features.length + 1, 0x20);
  const now = new Date();
  buffer[0] = 0x03;
  buffer[1] = now.getFullYear() - 1900;
  buffer[2] = now.getMonth() + 1;
  buffer[3] = now.getDate();
  buffer.writeUInt32LE(features.length, 4);
  buffer.writeUInt16LE(headerLength, 8);
  buffer.writeUInt16LE(recordLength, 10);

  fields.forEach((field, index) => {
    const offset = 32 + index * 32;
    Buffer.from(field[0], 'ascii').copy(buffer, offset, 0, 11);
    buffer[offset + 11] = field[1].charCodeAt(0);
    buffer[offset + 16] = field[2];
    buffer[offset + 17] = field[3];
  });
  buffer[headerLength - 1] = 0x0d;

  features.forEach((feature, rowIndex) => {
    let cursor = headerLength + rowIndex * recordLength;
    buffer[cursor] = 0x20;
    cursor += 1;
    const values = [
      feature.properties.parcel_id,
      feature.properties.name,
      feature.properties.status,
      feature.properties.verification,
      feature.properties.area_ha,
      feature.properties.infection_rate,
      feature.properties.image_count,
      feature.properties.infected_images,
      feature.properties.missions,
    ];
    fields.forEach((field, fieldIndex) => {
      const value = values[fieldIndex];
      const text =
        field[1] === 'N'
          ? Number(value ?? 0).toFixed(field[3]).padStart(field[2]).slice(-field[2])
          : String(value ?? '').slice(0, field[2]).padEnd(field[2]);
      Buffer.from(text, 'utf8').copy(buffer, cursor, 0, field[2]);
      cursor += field[2];
    });
  });
  buffer[buffer.length - 1] = 0x1a;
  return buffer;
}

export function createShapefileZip(features: ShapeFeature[]): Buffer {
  const contents = features.map(recordContent);
  const shpLength = 100 + contents.reduce((sum, content) => sum + 8 + content.length, 0);
  const shp = Buffer.alloc(shpLength);
  const box = bounds(features);
  writeHeader(shp, shpLength / 2, box);
  let cursor = 100;
  contents.forEach((content, index) => {
    shp.writeInt32BE(index + 1, cursor);
    shp.writeInt32BE(content.length / 2, cursor + 4);
    content.copy(shp, cursor + 8);
    cursor += 8 + content.length;
  });

  const shxLength = 100 + contents.length * 8;
  const shx = Buffer.alloc(shxLength);
  writeHeader(shx, shxLength / 2, box);
  cursor = 100;
  let offsetWords = 50;
  contents.forEach((content) => {
    shx.writeInt32BE(offsetWords, cursor);
    shx.writeInt32BE(content.length / 2, cursor + 4);
    offsetWords += 4 + content.length / 2;
    cursor += 8;
  });

  return createZip([
    { name: 'zones.shp', data: shp },
    { name: 'zones.shx', data: shx },
    { name: 'zones.dbf', data: dbf(features) },
    {
      name: 'zones.prj',
      data: Buffer.from('GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'),
    },
    { name: 'zones.cpg', data: Buffer.from('UTF-8') },
  ]);
}
