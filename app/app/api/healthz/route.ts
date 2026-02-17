
import { NextResponse } from 'next/server';

/**
 * Simple Health Check Endpoint (sin database check)
 * Para verificación rápida del servidor
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
