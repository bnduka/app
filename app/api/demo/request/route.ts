
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { demoRequestSchema } from '@/lib/validation/schemas';
import { createValidationMiddleware, createErrorResponse, createSuccessResponse, validateRateLimitHeaders } from '@/lib/validation/middleware';
import { EmailService } from '@/lib/security/email-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get request metadata for rate limiting
    const { ipAddress, userAgent } = validateRateLimitHeaders(request);

    // Validate input data
    const validationMiddleware = createValidationMiddleware(demoRequestSchema);
    const validation = await validationMiddleware(request);
    
    if (!validation.success) {
      return validation.response!;
    }

    const { firstName, lastName, email, company, phone, country, hearAboutUs } = validation.data!;

    // Save demo request to database
    const demoRequest = await prisma.demoRequest.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        company,
        phone,
        country,
        hearAboutUs: hearAboutUs || null,
        ipAddress,
        userAgent,
        status: 'PENDING',
        createdAt: new Date(),
      },
    });

    // Prepare email content
    const emailSubject = `New Demo Request from ${firstName} ${lastName} at ${company}`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Demo Request</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-row { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #2563eb; }
    .label { font-weight: bold; color: #374151; }
    .value { margin-left: 10px; color: #6b7280; }
    .footer { margin-top: 20px; padding: 15px; background-color: #e5e7eb; border-radius: 4px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ BGuard Suite - New Demo Request</h1>
    </div>
    <div class="content">
      <p>A new demo request has been submitted through the BGuard Suite website.</p>
      
      <div class="info-row">
        <span class="label">Name:</span>
        <span class="value">${firstName} ${lastName}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">${email}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Company:</span>
        <span class="value">${company}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Phone:</span>
        <span class="value">${phone}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Country:</span>
        <span class="value">${country}</span>
      </div>
      
      ${hearAboutUs ? `
      <div class="info-row">
        <span class="label">How they heard about us:</span>
        <span class="value">${hearAboutUs}</span>
      </div>
      ` : ''}
      
      <div class="info-row">
        <span class="label">Request ID:</span>
        <span class="value">${demoRequest.id}</span>
      </div>
      
      <div class="info-row">
        <span class="label">Submitted:</span>
        <span class="value">${new Date().toLocaleString()}</span>
      </div>
      
      <div class="info-row">
        <span class="label">IP Address:</span>
        <span class="value">${ipAddress}</span>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Contact the prospect within 24 hours</li>
        <li>Schedule a personalized demo based on their company needs</li>
        <li>Follow up with relevant use cases and security solutions</li>
      </ul>
      
      <p>This is an automated message from the BGuard Suite website demo request system.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email notification
    try {
      await EmailService.sendEmail({
        to: 'info@bamfondglobal.com',
        subject: emailSubject,
        html: emailBody,
        text: `New Demo Request from ${firstName} ${lastName} at ${company}`, // Fallback text version
        from: 'noreply@bguard.com',
      });
    } catch (emailError) {
      console.error('Failed to send demo request email:', emailError);
      // Don't fail the request if email fails, but log it
      // The demo request is still saved in the database
    }

    return createSuccessResponse(
      {
        requestId: demoRequest.id,
        message: 'Demo request submitted successfully',
      },
      'Demo request submitted successfully',
      201
    );

  } catch (error) {
    console.error('Error processing demo request:', error);
    return createErrorResponse('Failed to submit demo request', 500);
  }
}
