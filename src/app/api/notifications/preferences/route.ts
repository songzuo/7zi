import { NextRequest, NextResponse } from 'next/server';

// 通知偏好设置类型
export interface NotificationPreference {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    slack: boolean;
  };
  types: {
    taskAssigned: { enabled: boolean; channel: ('inApp' | 'email' | 'slack')[] };
    taskCompleted: { enabled: boolean; channel: ('inApp' | 'email' | 'slack')[] };
    projectUpdate: { enabled: boolean; channel: ('inApp' | 'email' | 'slack')[] };
    mention: { enabled: boolean; channel: ('inApp' | 'email' | 'slack')[] };
    system: { enabled: boolean; channel: ('inApp' | 'email' | 'slack')[] };
  };
  updatedAt: string;
}

// 默认偏好设置
const defaultPreferences: Omit<NotificationPreference, 'userId' | 'updatedAt'> = {
  channels: {
    inApp: true,
    email: true,
    slack: false,
  },
  types: {
    taskAssigned: { enabled: true, channel: ['inApp', 'email'] },
    taskCompleted: { enabled: true, channel: ['inApp'] },
    projectUpdate: { enabled: true, channel: ['inApp'] },
    mention: { enabled: true, channel: ['inApp', 'email', 'slack'] },
    system: { enabled: true, channel: ['inApp'] },
  },
};

// 模拟用户偏好存储
const userPreferences: Map<string, NotificationPreference> = new Map();

// GET /api/notifications/preferences - 获取用户偏好
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default-user';
  
  const preferences = userPreferences.get(userId) || {
    userId,
    ...defaultPreferences,
    updatedAt: new Date().toISOString(),
  };
  
  return NextResponse.json({
    success: true,
    data: preferences,
  });
}

// PUT /api/notifications/preferences - 更新用户偏好
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || 'default-user';
    
    const preferences: NotificationPreference = {
      userId,
      channels: body.channels || defaultPreferences.channels,
      types: body.types || defaultPreferences.types,
      updatedAt: new Date().toISOString(),
    };
    
    userPreferences.set(userId, preferences);
    
    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// POST /api/notifications/preferences/reset - 重置为默认
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || 'default-user';
  
  const preferences: NotificationPreference = {
    userId,
    ...defaultPreferences,
    updatedAt: new Date().toISOString(),
  };
  
  userPreferences.set(userId, preferences);
  
  return NextResponse.json({
    success: true,
    data: preferences,
    message: 'Preferences reset to defaults',
  });
}
