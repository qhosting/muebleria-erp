
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function authMiddleware(
  request: NextRequest,
  requiredRoles?: string[]
) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  if (requiredRoles && !requiredRoles.includes(token.role as string)) {
    return NextResponse.json(
      { error: 'Permisos insuficientes' },
      { status: 403 }
    );
  }

  return null; // Continue with the request
}

export function apiResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
