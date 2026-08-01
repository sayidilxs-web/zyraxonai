/** Central route table for the ZYRAXON REST API. */
import { buildContext } from './context.server';
import { notFound, ok, preflight, toErrorResponse } from './http.server';
import { githubExchange, githubCallbackRedirect } from './auth.server';
import * as users from './users.server';
import * as items from './items.server';
import * as social from './social.server';
import * as market from './marketplace.server';
import * as ai from './ai.server';
import * as analytics from './analytics.server';
import * as admin from './admin.server';
import * as notifications from './notifications.server';
import type { ApiContext } from './context.server';

type Handler = (ctx: ApiContext) => Promise<unknown> | unknown;
type Route = { method: string; pattern: string[]; handler: Handler; raw?: boolean };

function r(method: string, path: string, handler: Handler, raw = false): Route {
  return { method, pattern: path.split('/').filter(Boolean), handler, raw };
}

const ROUTES: Route[] = [
  // Auth
  r('POST', '/auth/github', githubExchange),
  r('GET', '/auth/github/callback', (ctx) => githubCallbackRedirect(ctx), true),

  // Users & social graph
  r('GET', '/users/:username', users.getUser),
  r('PATCH', '/users/:username', users.updateUser),
  r('PUT', '/users/:username', users.updateUser),
  r('GET', '/users/:username/stats', users.userStats),
  r('GET', '/users/:username/likes', users.userLikes),
  r('POST', '/users/:username/follow', users.followUser),
  r('DELETE', '/users/:username/follow', users.unfollowUser),
  r('GET', '/users/:username/followers', users.listFollowers),
  r('GET', '/users/:username/following', users.listFollowing),

  // Ecosystem items
  r('GET', '/categories', items.categoryStats),
  r('GET', '/items', items.listItems),
  r('POST', '/items', items.createItem),
  r('GET', '/items/:id', items.getItem),
  r('PATCH', '/items/:id', items.updateItem),
  r('PUT', '/items/:id', items.updateItem),
  r('DELETE', '/items/:id', items.deleteItem),
  r('GET', '/items/:id/versions', items.listVersions),
  r('POST', '/items/:id/versions', items.createVersion),

  // Likes & comments
  r('POST', '/items/:id/like', social.likeItem),
  r('DELETE', '/items/:id/like', social.unlikeItem),
  r('GET', '/items/:id/likes', social.listLikers),
  r('GET', '/items/:id/comments', social.listComments),
  r('POST', '/items/:id/comments', social.createComment),
  r('PATCH', '/comments/:commentId', social.updateComment),
  r('PUT', '/comments/:commentId', social.updateComment),
  r('DELETE', '/comments/:commentId', social.deleteComment),

  // Discovery & marketplace
  r('GET', '/search', market.search),
  r('GET', '/trending', market.trending),
  r('GET', '/featured', market.featured),
  r('GET', '/marketplace/items', market.marketplaceItems),
  r('POST', '/marketplace/items/:id/publish', market.publishToMarketplace),
  r('DELETE', '/marketplace/items/:id/publish', market.unpublishFromMarketplace),

  // AI sessions
  r('POST', '/ai/sessions', ai.createSession),
  r('GET', '/ai/sessions/:sessionId', ai.getSession),
  r('POST', '/ai/sessions/:sessionId/events', ai.logEvent),
  r('DELETE', '/ai/sessions/:sessionId', ai.endSession),

  // Analytics
  r('POST', '/analytics/track', analytics.track),
  r('GET', '/analytics/items/:itemId/downloads', analytics.downloads),
  r('GET', '/analytics/items/:itemId/views', analytics.views),

  // Notifications
  r('GET', '/notifications', notifications.listNotifications),
  r('POST', '/notifications/read-all', notifications.markAllRead),
  r('POST', '/notifications/:id/read', notifications.markRead),

  // Admin
  r('GET', '/admin/stats', admin.stats),
  r('GET', '/admin/items/pending', admin.pendingItems),
  r('POST', '/admin/items/:id/approve', admin.approveItem),
  r('POST', '/admin/items/:id/reject', admin.rejectItem),
];

function match(route: Route, method: string, segments: string[]): Record<string, string> | null {
  if (route.method !== method) return null;
  if (route.pattern.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const p = route.pattern[i]!;
    const s = segments[i]!;
    if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(s);
    else if (p !== s) return null;
  }
  return params;
}

/** Handle a request whose path has already been stripped of its API prefix. */
export async function handleApiRequest(request: Request, path: string): Promise<Response> {
  if (request.method === 'OPTIONS') return preflight();

  const url = new URL(request.url);
  const segments = path.split('/').filter(Boolean);

  for (const route of ROUTES) {
    const params = match(route, request.method, segments);
    if (!params) continue;
    try {
      const ctx = await buildContext(request, url, params);
      const result = await route.handler(ctx);
      if (result instanceof Response) return result;
      return ok(result, request.method === 'POST' ? 201 : 200);
    } catch (error) {
      return toErrorResponse(error);
    }
  }

  return toErrorResponse(notFound(`No API route for ${request.method} /${segments.join('/')}`));
}
