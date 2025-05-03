/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResizeService {
  @MessagePattern({ cmd: 'resize_image' })
  async resize(data: { imagePath: string; width: number; height: number }) {
    try {
      const { imagePath, width, height } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = 'resized_image.png';
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputImage = await fs.promises.readFile(imagePath);
      const { data: inputBuffer, info: inputInfo } = await sharp(inputImage).raw().toBuffer({ resolveWithObject: true });

      const resizedBuffer = this.bilinearInterpolation(inputBuffer, inputInfo.height,  inputInfo.width, height, width);

      // Save the resized image
      await sharp(resizedBuffer, {
        raw: {
          width: width,
          height: height,
          channels: inputInfo.channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image resized successfully',
        savedImagePath: outputFilePath,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private bilinearInterpolation(
    inputBuffer: Buffer,
    inputWidth: number,
    inputHeight: number,
    outputWidth: number,
    outputHeight: number
  ): Buffer {
    const outputBuffer = Buffer.alloc(outputWidth * outputHeight * 3);
    
    const xRatio = inputWidth / outputWidth;
    const yRatio = inputHeight / outputHeight;

    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const x1 = Math.floor(x * xRatio);
        const y1 = Math.floor(y * yRatio);
        const x2 = Math.min(x1 + 1, inputWidth - 1);
        const y2 = Math.min(y1 + 1, inputHeight - 1);

        const xFraction = x * xRatio - x1;
        const yFraction = y * yRatio - y1;

        for (let c = 0; c < 3; c++) {
          const topLeft = inputBuffer[(y1 * inputWidth + x1) * 3 + c];
          const topRight = inputBuffer[(y1 * inputWidth + x2) * 3 + c];
          const bottomLeft = inputBuffer[(y2 * inputWidth + x1) * 3 + c];
          const bottomRight = inputBuffer[(y2 * inputWidth + x2) * 3 + c];

          const top = topLeft * (1 - xFraction) + topRight * xFraction;
          const bottom = bottomLeft * (1 - xFraction) + bottomRight * xFraction;
          const value = top * (1 - yFraction) + bottom * yFraction;

          outputBuffer[(y * outputWidth + x) * 3 + c] = Math.round(value);
        }
      }
    }

    return outputBuffer;
  }
}