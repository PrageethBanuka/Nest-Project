import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  private rotatePixels(
    inputBuffer: Buffer,
    width: number,
    height: number,
    angle: number
  ): Buffer {
    // Convert angle to radians
    const radians = (angle * Math.PI) / 180;
    
    // Create output buffer with the same size as input
    const channels = 3; // Most images are RGB (3 channels)
    const outputBuffer = Buffer.alloc(width * height * channels);
    
    // Calculate the center of the image
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Initialize output buffer with black pixels
    outputBuffer.fill(0);
    
    // Apply rotation to each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate the position relative to center
        const dx = x - centerX;
        const dy = y - centerY;
        
        // Apply rotation formula
        const cosAngle = Math.cos(radians);
        const sinAngle = Math.sin(radians);
        
        // Perform the rotation (note: we use the inverse rotation to find the source pixel)
        const srcX = Math.round(dx * cosAngle + dy * sinAngle + centerX);
        const srcY = Math.round(-dx * sinAngle + dy * cosAngle + centerY);
        
        // Check if the source pixel is within bounds
        if (
          srcX >= 0 &&
          srcX < width &&
          srcY >= 0 &&
          srcY < height
        ) {
          // Copy each channel from source to target
          for (let c = 0; c < channels; c++) {
            const sourceIndex = (srcY * width + srcX) * channels + c;
            const targetIndex = (y * width + x) * channels + c;
            
            if (sourceIndex < inputBuffer.length && targetIndex < outputBuffer.length) {
              outputBuffer[targetIndex] = inputBuffer[sourceIndex];
            }
          }
        }
      }
    }
    
    return outputBuffer;
  }

  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(data: { imagePath: string; angle: number }) {
    try {
      const { imagePath, angle } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `rotated_${angle}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine image dimensions');
      }

      const { width, height } = metadata;
      const channels = metadata.channels || 3;

      // Extract raw image data
      const rawData = await image.raw().toBuffer();

      // Perform rotation
      const rotatedBuffer = this.rotatePixels(rawData, width, height, angle);

      // Save the rotated image
      await sharp(rotatedBuffer, {
        raw: {
          width: width,
          height: height,
          channels: channels
        }
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image rotated successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Rotation error:', error);
      return {
        success: false,
        message: 'Failed to rotate image',
        error: error.message,
      };
    }
  }
}