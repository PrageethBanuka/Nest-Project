/**
 * Applies double threshold to classify edges as strong, weak, or non-edges
 * Strong edges: magnitude >= highThreshold
 * Weak edges: magnitude >= lowThreshold && magnitude < highThreshold
 * Non-edges: magnitude < lowThreshold
 */
export function doubleThreshold(
  input: Float32Array, 
  width: number, 
  height: number, 
  lowThreshold: number, 
  highThreshold: number
): {
  strongEdges: Uint8Array;
  weakEdges: Uint8Array;
} {
  const strongEdges = new Uint8Array(width * height);
  const weakEdges = new Uint8Array(width * height);

  // Process all pixels
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    
    if (value >= highThreshold) {
      // Strong edge pixels
      strongEdges[i] = 255;
    } else if (value >= lowThreshold) {
      // Weak edge pixels
      weakEdges[i] = 255;
    }
    // Pixels below lowThreshold are considered non-edges and remain 0
  }

  return { strongEdges, weakEdges };
}