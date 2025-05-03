/**
 * Performs non-maximum suppression to thin edges
 * This step preserves only the local maxima in the gradient direction and suppresses others
 */
export function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Float32Array,
  width: number,
  height: number
): Float32Array {
  const result = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx];
      const mag = magnitude[idx];

      // Skip pixels with no gradient
      if (mag === 0) continue;

      // Define neighbors to check based on gradient direction
      let neighbor1X = 0, neighbor1Y = 0;
      let neighbor2X = 0, neighbor2Y = 0;

      // Round angle to nearest 45 degrees
      // 0 degrees (horizontal edge)
      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
        neighbor1X = x + 1;
        neighbor1Y = y;
        neighbor2X = x - 1;
        neighbor2Y = y;
      }
      // 45 degrees (diagonal edge)
      else if (angle >= 22.5 && angle < 67.5) {
        neighbor1X = x + 1;
        neighbor1Y = y - 1;
        neighbor2X = x - 1;
        neighbor2Y = y + 1;
      }
      // 90 degrees (vertical edge)
      else if (angle >= 67.5 && angle < 112.5) {
        neighbor1X = x;
        neighbor1Y = y + 1;
        neighbor2X = x;
        neighbor2Y = y - 1;
      }
      // 135 degrees (diagonal edge)
      else if (angle >= 112.5 && angle < 157.5) {
        neighbor1X = x - 1;
        neighbor1Y = y - 1;
        neighbor2X = x + 1;
        neighbor2Y = y + 1;
      }

      // Ensure neighbors are within the image boundaries
      neighbor1X = Math.min(Math.max(neighbor1X, 0), width - 1);
      neighbor1Y = Math.min(Math.max(neighbor1Y, 0), height - 1);
      neighbor2X = Math.min(Math.max(neighbor2X, 0), width - 1);
      neighbor2Y = Math.min(Math.max(neighbor2Y, 0), height - 1);

      // Get magnitude values of the neighbors
      const neighbor1Idx = neighbor1Y * width + neighbor1X;
      const neighbor2Idx = neighbor2Y * width + neighbor2X;

      // Keep the edge only if it's a local maximum in the gradient direction
      if (mag >= magnitude[neighbor1Idx] && mag >= magnitude[neighbor2Idx]) {
        result[idx] = mag;
      }
      // Otherwise suppress it
    }
  }

  return result;
}