import { errorResponse, json, siteOrigin } from './share-http';

export async function handleCreateShare(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { sessionID?: string };
    const sessionID = typeof body.sessionID === 'string' ? body.sessionID.trim() : '';
    if (!sessionID || sessionID.length > 200) {
      return json({ error: 'sessionID is required (max 200 chars)' }, 400);
    }
    const { createShare } = await import('./shares.server');
    const { id, secret } = await createShare(sessionID);
    return json({ id, secret, url: `${siteOrigin(request)}/share/${id}` }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSyncShare(request: Request, id: string): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { secret?: string; data?: unknown };
    if (typeof body.secret !== 'string' || !body.secret) return json({ error: 'secret is required' }, 400);
    if (!Array.isArray(body.data)) return json({ error: 'data must be an array' }, 400);
    const { syncShare } = await import('./shares.server');
    const share = await syncShare(id, body.secret, body.data as Record<string, unknown>[]);
    return json({ ok: true, share });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleDeleteShare(request: Request, id: string): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as { secret?: string };
    if (typeof body.secret !== 'string' || !body.secret) return json({ error: 'secret is required' }, 400);
    const { deleteShare } = await import('./shares.server');
    await deleteShare(id, body.secret);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleGetShareData(id: string): Promise<Response> {
  try {
    const { getShare } = await import('./shares.server');
    const share = await getShare(id);
    if (!share) return json({ error: 'Share not found' }, 404);
    return json(share);
  } catch (error) {
    return errorResponse(error);
  }
}
