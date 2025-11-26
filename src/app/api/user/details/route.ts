import { NextResponse } from 'next/server';

import {
  getUser,
  getUserAccountInfo,
  getUserStats,
} from '@/lib/user/server';

export async function GET() {
  try {
    const [user, account, stats] = await Promise.all([
      getUser(),
      getUserAccountInfo(),
      getUserStats(),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      user,
      account,
      stats,
    });
  } catch (error) {
    console.error('Failed to load user details', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load user details' },
      { status: 500 },
    );
  }
}
