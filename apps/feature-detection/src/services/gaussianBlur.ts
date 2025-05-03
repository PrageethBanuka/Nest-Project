// Utility to generate a Gaussian kernel
function generateGaussianKernel(size: number, sigma: number): number[][] {
  const kernel: number[][] = [];
  const mean = Math.floor(size / 2);
  let sum = 0;

  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - mean;
      const dy = y - mean;
      // Correct Gaussian formula
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) / 
                    (2 * Math.PI * sigma * sigma);
      kernel[y][x] = value;
      sum += value;
    }
  }

  // Normalize the kernel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

// Apply Gaussian blur to an image
export function applyGaussianBlur(
  input: Buffer,
  width: number,
  height: number,
  sigma: number = 1.0
): Buffer {
  // Calculate kernel size based on sigma (6*sigma rule of thumb, always odd)
  const kernelSize = Math.max(3, Math.ceil(sigma * 6 + 1) | 1);
  const kernel = generateGaussianKernel(kernelSize, sigma);
  const output = Buffer.alloc(input.length);
  const halfSize = Math.floor(kernelSize / 2);

  // Apply convolution with Gaussian kernel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      for (let ky = -halfSize; ky <= halfSize; ky++) {
        for (let kx = -halfSize; kx <= halfSize; kx++) {
          // Handle border cases by clamping to the image boundaries
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          
          const pixelValue = input[py * width + px];
          const weight = kernel[ky + halfSize][kx + halfSize];
          
          sum += pixelValue * weight;
        }
      }

      // Clamp the result to 0-255 range
      output[y * width + x] = Math.min(Math.max(Math.round(sum), 0), 255);
    }
  }

  return output;
}