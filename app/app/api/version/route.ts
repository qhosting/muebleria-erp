
import { NextResponse } from 'next/server';
import packageInfo from '@/package.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: packageInfo.version,
    timestamp: Date.now()
  });
}
