
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApiKeyManager } from '@/lib/security/api-keys';

export async function DELETE(request: NextRequest, props: { params: Promise<{ keyId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = await ApiKeyManager.deactivateApiKey(params.keyId);
    
    return NextResponse.json({ success: true, apiKey });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ keyId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    
    if (action === 'rotate') {
      const rotatedKey = await ApiKeyManager.rotateApiKey(params.keyId);
      
      // Remove the plain key from storage after first return
      const { key, ...apiKeyData } = rotatedKey;
      
      return NextResponse.json({
        success: true,
        apiKey: { ...apiKeyData, key }, // Include new key only in this response
        message: 'API key rotated successfully. Make sure to copy the new key now.',
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API key action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform API key action' },
      { status: 500 }
    );
  }
}
