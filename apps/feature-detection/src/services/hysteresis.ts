/**
 * Edge tracking by hysteresis
 * Connects weak edges to strong edges and keeps only those weak edges that are
 * connected to strong edges directly or through other weak edges
 */
export function hysteresis(
  strongEdges: Uint8Array,
  weakEdges: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(width * height);
  const visited = new Set<number>();
  
  // Copy strong edges to result
  for (let i = 0; i < strongEdges.length; i++) {
    if (strongEdges[i] > 0) {
      result[i] = 255;
    }
  }

  // Define 8-connected neighborhood directions
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];
  
  // Process all strong edge pixels and their connected weak edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // If this is a strong edge that hasn't been visited yet
      if (strongEdges[idx] > 0 && !visited.has(idx)) {
        // Perform depth-first search from this strong edge
        dfs(x, y, width, height, strongEdges, weakEdges, result, visited, directions);
      }
    }
  }

  return result;
}

/**
 * Depth-first search to connect weak edges to strong edges
 */
function dfs(
  x: number,
  y: number,
  width: number,
  height: number,
  strongEdges: Uint8Array,
  weakEdges: Uint8Array,
  result: Uint8Array,
  visited: Set<number>,
  directions: number[][]
): void {
  const idx = y * width + x;
  
  // If already visited, return
  if (visited.has(idx)) return;
  
  // Mark as visited
  visited.add(idx);
  
  // Mark as an edge in the final result
  result[idx] = 255;
  
  // Check all 8 neighbors
  for (const [dx, dy] of directions) {
    const nx = x + dx;
    const ny = y + dy;
    
    // Stay within image boundaries
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    
    const neighborIdx = ny * width + nx;
    
    // If neighbor is a weak edge and not visited, process it recursively
    if ((weakEdges[neighborIdx] > 0) && !visited.has(neighborIdx)) {
      dfs(nx, ny, width, height, strongEdges, weakEdges, result, visited, directions);
    }
  }
}