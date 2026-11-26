import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleError } from '@/lib/auth/guard';
import { getRequestDetail } from '@/lib/requests';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    return NextResponse.json(await getRequestDetail(id, user));
  } catch (error) {
    return handleError(error, 'Error fetching request:');
  }
}
