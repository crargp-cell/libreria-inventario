import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleError } from '@/lib/auth/guard';
import { WAREHOUSE } from '@/lib/auth/roles';
import { dispatchRequest, getRequestDetail } from '@/lib/requests';
import { clientIp, readJson } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, WAREHOUSE);
    const { id } = await params;
    const { dispatch, duplicate } = await dispatchRequest(id, user.userId, await readJson(req), clientIp(req));
    return NextResponse.json(
      { duplicate, dispatchNumber: dispatch.number, request: await getRequestDetail(id, user) },
      { status: duplicate ? 200 : 201 }
    );
  } catch (error) {
    return handleError(error, 'Error dispatching request:');
  }
}
