// Define Sobel kernels
const sobelX = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1]
];

const sobelY = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1]
];

// Function to compute Sobel gradients, returning both magnitude and direction
export function computeSobelGradients(
  input: Buffer,
  width: number,
  height: number
): {
  magnitude: Float32Array;
  direction: Float32Array;
} {
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  // Find the maximum gradient value for normalization
  let maxMagnitude = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      // Apply the Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = input[(y + ky) * width + (x + kx)];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }

      const idx = y * width + x;
      
      // Calculate gradient magnitude
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      maxMagnitude = Math.max(maxMagnitude, magnitude[idx]);
      
      // Calculate gradient direction in degrees
      // atan2 returns angle in radians in range [-π, π]
      direction[idx] = Math.atan2(gy, gx) * (180 / Math.PI);
      
      // Normalize direction to [0, 180) for edge direction
      if (direction[idx] < 0) {
        direction[idx] += 180;
      }
    }
  }

  // Normalize the magnitude to [0, 255] range for easier processing
  if (maxMagnitude > 0) {
    for (let i = 0; i < magnitude.length; i++) {
      magnitude[i] = (magnitude[i] / maxMagnitude) * 255;
    }
  }

  return { magnitude, direction };
}