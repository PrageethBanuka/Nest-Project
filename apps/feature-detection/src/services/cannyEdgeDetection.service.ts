import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { MessagePattern } from '@nestjs/microservices';
import { convertToGreyscale } from '../../../common/utils/greyscale';
import { applyGaussianBlur } from './gaussianBlur';
import { computeSobelGradients } from './sobelGradients';
import { nonMaxSuppression } from './nonMaxSuppression';
import { doubleThreshold } from './doubleThreshold';
import { hysteresis } from './hysteresis';


@Injectable()
export class CannyEdgeDetectionService {
  @MessagePattern({ cmd: 'canny_edge_detection' })
  async detectEdges(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) throw new Error('File does not exist');

      const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
      const outputFileName = 'canny_edges.png';
      const outputFilePath = path.join(outputDir, outputFileName);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // Convert to greyscale
      const { buffer: gray, width, height } = await convertToGreyscale(imagePath);

      // Calculate gradients
      const { magnitude, direction } = computeSobelGradients(gray, width!, height!);

      // Non-Max Suppression
      const thinEdges = nonMaxSuppression(magnitude, direction, width!, height!);

      // Double Threshold
      const { strongEdges, weakEdges } = doubleThreshold(thinEdges, width!, height!, 5, 25);

      // Save the final output
      await sharp(strongEdges, {
        raw: { width: width!, height: height!, channels: 1 },
      }).png().toFile(outputFilePath);

      return {
        success: true,
        message: 'Canny edge detection complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { convertToGreyscale } from '../../../common/utils/greyscale';
import { applyGaussianBlur } from './gaussianBlur';
import { computeSobelGradients } from './sobelGradients';
import { nonMaxSuppression } from './nonMaxSuppression';
import { doubleThreshold } from './doubleThreshold';
import { hysteresis } from './hysteresis';

@Injectable()
export class CannyEdgeDetectionService {
  private readonly logger = new Logger(CannyEdgeDetectionService.name);

  @MessagePattern({ cmd: 'canny_edge_detection' })
  async detectEdges(
    @Payload()
    data: {
      imagePath: string;
      lowThreshold?: number;  // Low threshold for edge detection (default 50)
      highThreshold?: number; // High threshold for edge detection (default 100)
      sigma?: number;         // Gaussian sigma (default 1.0)
    },
  ) {
    try {
      const { 
        imagePath, 
        lowThreshold = 50, 
        highThreshold = 100, 
        sigma = 1.0 
      } = data;

      if (!fs.existsSync(imagePath)) {
        return { error: 'Image not found', statusCode: 404 };
      }

      // Create output directory if it doesn't exist
      const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputFileName = `canny_edges_${path.basename(imagePath)}`;
      const outputFilePath = path.join(outputDir, outputFileName);

      // Step 1: Convert to grayscale
      const { buffer: grayscaleBuffer, width, height } = await convertToGreyscale(imagePath);

      // Step 2: Apply Gaussian blur
      const blurredImage = applyGaussianBlur(grayscaleBuffer, width, height, sigma);

      // Step 3: Calculate gradients using Sobel
      const { magnitude, direction } = computeSobelGradients(blurredImage, width, height);

      // Step 4: Non-maximum suppression
      const suppressedEdges = nonMaxSuppression(magnitude, direction, width, height);

      // Step 5: Double threshold
      const { strongEdges, weakEdges } = doubleThreshold(
        suppressedEdges,
        width,
        height,
        lowThreshold,
        highThreshold
      );

      // Step 6: Edge tracking by hysteresis
      const finalEdges = hysteresis(strongEdges, weakEdges, width, height);

      // Convert to Uint8Array for saving
      const outputImage = new Uint8Array(width * height);
      for (let i = 0; i < finalEdges.length; i++) {
        outputImage[i] = finalEdges[i] > 0 ? 255 : 0;
      }

      // Save the result
      await sharp(outputImage, {
        raw: { width, height, channels: 1 }
      })
      .png()
      .toFile(outputFilePath);

      this.logger.log(`Canny edge detection complete, saved to ${outputFilePath}`);

      return {
        success: true,
        message: 'Canny edge detection complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      this.logger.error(`Error in Canny edge detection: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
