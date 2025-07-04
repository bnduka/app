
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApiKeyManager } from '@/lib/security/api-keys';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKeys = await ApiKeyManager.getUserApiKeys(session.user.id);
    
    return NextResponse.json({ apiKeys });
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, scopes, expiresInDays } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate scopes
    if (scopes && scopes.length > 0) {
      const scopeValidation = ApiKeyManager.validateScopes(scopes);
      if (!scopeValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid scopes', details: scopeValidation.errors },
          { status: 400 }
        );
      }
    }

    const apiKey = await ApiKeyManager.generateApiKey(
      session.user.id,
      name,
      scopes || [],
      expiresInDays
    );
    
    // Remove the plain key from the response after first return
    const { key, ...apiKeyData } = apiKey;
    
    return NextResponse.json({
      success: true,
      apiKey: { ...apiKeyData, key }, // Include key only in this response
      message: 'API key created successfully. Make sure to copy it now as it will not be shown again.',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
