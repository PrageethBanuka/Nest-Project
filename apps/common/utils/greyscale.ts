import sharp from 'sharp';

export async function convertToGreyscale(imagePath: string): Promise<{ buffer: Buffer, width: number, height: number }> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });

  // Allocate buffer for greyscale image
  const greyscaleBuffer = Buffer.alloc(info.width * info.height);

  // Linear approximation of gamma correction for greyscale conversion
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];       // Red channel
    const g = data[i + 1];   // Green channel
    const b = data[i + 2];   // Blue channel

    // Linear approximation formula for greyscale
    const y = 0.299 * r + 0.587 * g + 0.114 * b;

    // Assign the calculated luminance to the greyscale buffer
    greyscaleBuffer[i / info.channels] = Math.round(y);
  }

  return {
    buffer: greyscaleBuffer,
    width: info.width,
    height: info.height,
  };
}