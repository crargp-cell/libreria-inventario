import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleError } from '@/lib/auth/guard';
import { REQUESTERS, WAREHOUSE } from '@/lib/auth/roles';
import { cancelRequest, getRequestDetail } from '@/lib/requests';
import { clientIp } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, [...REQUESTERS, ...WAREHOUSE]);
    const { id } = await params;
    await cancelRequest(id, user, clientIp(req));
    return NextResponse.json(await getRequestDetail(id, user));
  } catch (error) {
    return handleError(error, 'Error cancelling request:');
  }
}
