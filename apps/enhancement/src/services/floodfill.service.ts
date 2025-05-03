import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class FloodFillService {
  private readonly logger = new Logger(FloodFillService.name);

  @MessagePattern({ cmd: 'flood_fill' })
  async floodFill(
    @Payload()
    data: {
      imagePath: string;
      sr: number;
      sc: number;
      newColor: [number, number, number];
      tolerance?: number; // Do not change the tolerance value(It is defined as 0 in the below code)
    },
  ) {
    const { imagePath, sr, sc, newColor, tolerance = 0 } = data;

    if (!fs.existsSync(imagePath)) {
      this.logger.error(`Image not found at path: ${imagePath}`);
      throw new Error('Image file not found');
    }

    const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
    const outputFileName = `flood_filled_${path.basename(imagePath)}`;
    const outputPath = path.join(outputDir, outputFileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        throw new Error('Could not determine image dimensions');
      }

      const { data: rawBuffer, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { channels } = info;

      // Create a new buffer for the output (clone the input buffer)
      const outputBuffer = Buffer.from(rawBuffer);

      // Helper function to calculate the buffer index for a given pixel position
      const getIndex = (x: number, y: number): number => {
        return (y * width + x) * channels;
      };

      // Helper function to get the color at a given pixel position
      const getColor = (buffer: Buffer, x: number, y: number): number[] => {
        const i = getIndex(x, y);
        const color: number[] = [];
        for (let c = 0; c < channels; c++) {
          color.push(buffer[i + c]);
        }
        return color;
      };

      // Helper function to set the color at a given pixel position
      const setColor = (buffer: Buffer, x: number, y: number, color: number[]) => {
        const i = getIndex(x, y);
        for (let c = 0; c < channels && c < color.length; c++) {
          buffer[i + c] = color[c];
        }
      };

      // Helper function to check if two colors are within tolerance
      const isWithinTolerance = (a: number[], b: number[]): boolean => {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          if (Math.abs(a[i] - b[i]) > tolerance) {
            return false;
          }
        }
        return true;
      };

      // Check if starting coordinates are within bounds
      if (sc < 0 || sc >= width || sr < 0 || sr >= height) {
        throw new Error(`Starting coordinates (${sc},${sr}) out of image bounds (${width}x${height})`);
      }

      // Get the color at the starting point (target color)
      const originalColor = getColor(rawBuffer, sc, sr);
      const newColorArray = newColor.slice(0, channels);

      // If the original color is already the same as the new color, nothing to do
      if (isWithinTolerance(originalColor, newColorArray) && tolerance === 0) {
        await sharp(outputBuffer, {
          raw: { width, height, channels },
        }).toFile(outputPath);
        
        return {
          message: 'Original and new color are the same. Nothing changed.',
          outputPath
        };
      }

      // Use queue for BFS approach (more efficient for large areas)
      const queue: [number, number][] = [[sc, sr]];
      const visited = new Set<string>();
      visited.add(`${sc},${sr}`);

      // Directions for 4-connected neighbors (up, down, left, right)
      const dx = [1, -1, 0, 0];
      const dy = [0, 0, 1, -1];

      let pixelsFilled = 0;
      
      // Implement the flood fill algorithm
      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        
        // Set the new color at current position
        setColor(outputBuffer, x, y, newColorArray);
        pixelsFilled++;
        
        // Check all four adjacent pixels
        for (let i = 0; i < 4; i++) {
          const nx = x + dx[i];
          const ny = y + dy[i];
          const key = `${nx},${ny}`;
          
          // If the pixel is within bounds and not visited yet
          if (
            nx >= 0 && nx < width &&
            ny >= 0 && ny < height &&
            !visited.has(key)
          ) {
            const neighborColor = getColor(rawBuffer, nx, ny);
            
            // If the neighbor color is within tolerance of the original color
            if (isWithinTolerance(neighborColor, originalColor)) {
              queue.push([nx, ny]);
              visited.add(key);
            }
          }
        }
      }

      // Write the modified image to file
      await sharp(outputBuffer, {
        raw: { width, height, channels },
      }).toFile(outputPath);

      return {
        message: `Flood fill applied successfully. ${pixelsFilled} pixels changed.`,
        outputPath,
        pixelsFilled,
      };
    } catch (error) {
      this.logger.error(`Error applying flood fill: ${error.message}`);
      throw error;
    }
  }
}