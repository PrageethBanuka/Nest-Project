import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { convertToGreyscale } from '../../../common/utils/greyscale';

@Injectable()
export class HistogramEqualizationService {
  @MessagePattern({ cmd: 'histogram_equalization' })
  async equalizeHistogram(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/enhancement/output_images');
      const outputFileName = 'histogram_equalized.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { buffer: raw, width, height } = await convertToGreyscale(imagePath);

      // Step 1: Calculate the histogram
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < raw.length; i++) {
        const intensity = raw[i];
        histogram[intensity]++;
      }

      // Step 2: Calculate the cumulative distribution function (CDF)
      const cdf = new Array(256).fill(0);
      cdf[0] = histogram[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }

      // Step 3: Calculate total pixels and normalize CDF
      const totalPixels = raw.length;
      const L = 256; // Number of intensity levels

      // Step 4: Create equalized image using the normalized CDF
      const equalized = Buffer.alloc(raw.length);

      // Find the first non-zero CDF value (cdf_min)
      let cdfMin = 0;
      for (let i = 0; i < 256; i++) {
        if (cdf[i] > 0) {
          cdfMin = cdf[i];
          break;
        }
      }

      // Apply histogram equalization formula
      for (let i = 0; i < raw.length; i++) {
        const originalIntensity = raw[i];
        
        // Formula: h(v) = round((cdf(v) - cdf_min) / (totalPixels - cdf_min) * (L - 1))
        let newIntensity;
        if (totalPixels - cdfMin === 0) {
          // Edge case: if all pixels have the same value
          newIntensity = originalIntensity;
        } else {
          newIntensity = Math.round(
            ((cdf[originalIntensity] - cdfMin) / (totalPixels - cdfMin)) * (L - 1)
          );
        }
        
        // Ensure the new intensity is within valid range
        newIntensity = Math.max(0, Math.min(255, newIntensity));
        equalized[i] = newIntensity;
      }

      // Save the equalized image
      await sharp(equalized, {
        raw: {
          width: width!,
          height: height!,
          channels: 1,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Histogram equalization complete',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}