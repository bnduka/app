
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { DeviceManager } from '@/lib/security/device-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await DeviceManager.getUserDevices(session.user.id);
    
    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
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

    const { deviceId, action } = await request.json();
    
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'trust':
        result = await DeviceManager.trustDevice(deviceId, session.user.id);
        break;
      case 'remove':
        result = await DeviceManager.removeDevice(deviceId, session.user.id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, device: result });
  } catch (error) {
    console.error('Device action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform device action' },
      { status: 500 }
    );
  }
}
