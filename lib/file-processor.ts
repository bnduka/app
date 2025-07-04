
import { prisma } from './db';

export class FileProcessor {
  static async processFile(file: File, threatModelId: string): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const content = await this.extractContent(buffer, file.type, file.name);
      
      // Only save file record to database if threatModelId is not temporary
      // Temporary IDs start with 'temp-'
      if (!threatModelId.startsWith('temp-')) {
        await prisma.fileUpload.create({
          data: {
            filename: `${Date.now()}-${file.name}`,
            originalName: file.name,
            filePath: `/uploads/${threatModelId}/${file.name}`,
            fileSize: file.size,
            mimeType: file.type,
            extractedText: typeof content === 'string' ? content : null,
            threatModelId,
          }
        });
      } else {
        // For temporary uploads, just process the file without saving to DB yet
        // The record will be created when the threat model is actually created
        console.log('Processing temporary file upload:', file.name);
      }

      return content;
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error('Failed to process file');
    }
  }

  static async extractContent(buffer: ArrayBuffer, mimeType: string, filename: string): Promise<string> {
    const uint8Array = new Uint8Array(buffer);

    if (mimeType === 'application/pdf') {
      // For PDF files, return base64 data URI for AI service
      const base64 = Buffer.from(uint8Array).toString('base64');
      return `data:application/pdf;base64,${base64}`;
    } 
    
    if (mimeType.startsWith('image/')) {
      // For images, return base64 data URI
      const base64 = Buffer.from(uint8Array).toString('base64');
      return `data:${mimeType};base64,${base64}`;
    }
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For DOCX files, extract text (simplified - in production would use proper library)
      return this.extractDocxText(uint8Array);
    }
    
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      // For text files, convert buffer to string
      return new TextDecoder().decode(uint8Array);
    }

    // Fallback for other file types
    return new TextDecoder().decode(uint8Array);
  }

  private static async extractDocxText(buffer: Uint8Array): Promise<string> {
    // For DOCX files, we'll return base64 for the AI service to process
    // The AI service can handle DOCX files directly when base64 encoded
    try {
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
    } catch (error) {
      console.error('DOCX processing error:', error);
      return 'Unable to process DOCX file';
    }
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload PDF, DOCX, TXT, CSV, or image files.' };
    }

    return { valid: true };
  }
}
