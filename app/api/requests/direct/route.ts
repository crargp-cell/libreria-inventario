import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleError } from '@/lib/auth/guard';
import { DIRECT_OUTPUT } from '@/lib/auth/roles';
import { createDirectDispatch, getRequestDetail } from '@/lib/requests';
import { clientIp, readJson } from '@/lib/http';

// Salida directa a venta o reposición, sin solicitud previa de un vendedor
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, DIRECT_OUTPUT);
    const { dispatch, duplicate } = await createDirectDispatch(user.userId, await readJson(req), clientIp(req));
    return NextResponse.json(
      { duplicate, dispatchNumber: dispatch.number, request: await getRequestDetail(dispatch.requestId, user) },
      { status: duplicate ? 200 : 201 }
    );
  } catch (error) {
    return handleError(error, 'Error registering direct output:');
  }
}
