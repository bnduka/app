
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { FileProcessor } from '@/lib/file-processor';
import { prisma } from '@/lib/db';
import { ActivityLogger, getRequestInfo } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  const { ipAddress, userAgent } = getRequestInfo(request);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      // Log unauthorized upload attempt
      await ActivityLogger.log({
        action: 'UPLOAD_FILE',
        status: 'FAILED',
        description: 'Unauthorized file upload attempt',
        ipAddress,
        userAgent,
        errorMessage: 'No valid session found',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      await ActivityLogger.logError(
        'UPLOAD_FILE',
        'File upload failed - no file provided',
        'No file in request body',
        session.user.id,
        { ipAddress, userAgent }
      );
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = FileProcessor.validateFile(file);
    if (!validation.valid) {
      await ActivityLogger.logError(
        'UPLOAD_FILE',
        `File upload failed - validation error: ${file.name}`,
        validation.error || 'File validation failed',
        session.user.id,
        { 
          ipAddress, 
          userAgent,
          details: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            validationError: validation.error
          })
        }
      );
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // For now, we'll create a temporary threat model ID
    // In a real implementation, this would be associated with an existing threat model
    const tempThreatModelId = 'temp-' + Date.now();

    // Process file
    const extractedContent = await FileProcessor.processFile(file, tempThreatModelId);

    // For temporary uploads, we don't create DB records yet
    // The file will be processed again when the threat model is created
    let fileUploadId = null;
    
    if (!tempThreatModelId.startsWith('temp-')) {
      // Get the created file upload record for non-temporary uploads
      const fileUpload = await prisma.fileUpload.findFirst({
        where: { 
          originalName: file.name,
          threatModelId: tempThreatModelId 
        },
        orderBy: { createdAt: 'desc' }
      });
      fileUploadId = fileUpload?.id || null;
    }

    // Log successful upload
    await ActivityLogger.logUserActivity(
      session.user.id,
      'UPLOAD_FILE',
      `Successfully uploaded file: ${file.name}`,
      'SUCCESS',
      {
        ipAddress,
        userAgent,
        entityType: 'file_upload',
        entityId: fileUploadId || tempThreatModelId,
        details: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          tempId: tempThreatModelId,
          contentExtracted: !!extractedContent
        })
      }
    );

    return NextResponse.json({
      message: 'File uploaded successfully',
      fileId: fileUploadId,
      filename: file.name,
      size: file.size,
      type: file.type,
      extractedContent: typeof extractedContent === 'string' ? extractedContent : null,
      tempId: tempThreatModelId, // Include temp ID for frontend reference
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Log upload error
    const session = await getServerSession(authOptions);
    await ActivityLogger.logError(
      'UPLOAD_FILE',
      'File upload failed due to server error',
      error instanceof Error ? error.message : 'Unknown error',
      session?.user?.id,
      { ipAddress, userAgent }
    );
    
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
