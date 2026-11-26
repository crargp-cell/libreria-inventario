import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleError } from '@/lib/auth/guard';
import { WAREHOUSE } from '@/lib/auth/roles';
import { approveRequest, getRequestDetail } from '@/lib/requests';
import { clientIp, readJson } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, WAREHOUSE);
    const { id } = await params;
    await approveRequest(id, user.userId, await readJson(req), clientIp(req));
    return NextResponse.json(await getRequestDetail(id, user));
  } catch (error) {
    return handleError(error, 'Error approving request:');
  }
}
