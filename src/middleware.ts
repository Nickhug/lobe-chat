import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';
import urlJoin from 'url-join';
import fs from 'fs';
import path from 'path';

import { appEnv } from '@/config/app';
import { authEnv } from '@/config/auth';
import { LOBE_LOCALE_COOKIE } from '@/const/locale';
import { LOBE_THEME_APPEARANCE } from '@/const/theme';
import NextAuthEdge from '@/libs/next-auth/edge';
import { Locales } from '@/locales/resources';
import { parseBrowserLanguage } from '@/utils/locale';
import { parseDefaultThemeFromCountry } from '@/utils/server/geo';
import { RouteVariants } from '@/utils/server/routeVariants';

import { OAUTH_AUTHORIZED } from './const/auth';

// Define log directory
const LOGS_DIR = process.env.USAGE_LOGS_DIR || path.join(process.cwd(), 'data', 'usage-logs');

// Make sure log directory exists
function ensureLogDir() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Initialize directory
ensureLogDir();

// Function to append log entry
function appendLog(userId: string, data: any) {
  try {
    const date = new Date();
    const filePath = path.join(LOGS_DIR, `${userId}_${date.getFullYear()}-${date.getMonth() + 1}.jsonl`);
    const logEntry = {
      ...data,
      timestamp: date.toISOString()
    };
    
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to write usage log:', error);
  }
}

export const config = {
  matcher: [
    // include any files in the api or trpc folders that might have an extension
    '/(api|trpc|webapi)(.*)',
    // include the /
    '/',
    '/discover',
    '/discover(.*)',
    '/chat',
    '/chat(.*)',
    '/changelog(.*)',
    '/settings(.*)',
    '/files',
    '/files(.*)',
    '/repos(.*)',
    '/profile(.*)',
    '/me',
    '/me(.*)',

    '/login(.*)',
    '/signup(.*)',
    '/next-auth/(.*)',
    // ↓ cloud ↓
  ],
};

const defaultMiddleware = (request: NextRequest) => {
  const url = new URL(request.url);

  // skip all api requests
  if (['/api', '/trpc', '/webapi'].some((path) => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 1. 从 cookie 中读取用户偏好
  const theme =
    request.cookies.get(LOBE_THEME_APPEARANCE)?.value || parseDefaultThemeFromCountry(request);

  // if it's a new user, there's no cookie
  // So we need to use the fallback language parsed by accept-language
  const browserLanguage = parseBrowserLanguage(request.headers);
  const locale = (request.cookies.get(LOBE_LOCALE_COOKIE)?.value || browserLanguage) as Locales;

  const ua = request.headers.get('user-agent');

  const device = new UAParser(ua || '').getDevice();

  // 2. 创建规范化的偏好值
  const route = RouteVariants.serializeVariants({
    isMobile: device.type === 'mobile',
    locale,
    theme,
  });

  // if app is in docker, rewrite to self container
  // https://github.com/lobehub/lobe-chat/issues/5876
  if (appEnv.MIDDLEWARE_REWRITE_THROUGH_LOCAL) {
    url.protocol = 'http';
    url.host = '127.0.0.1';
    url.port = process.env.PORT || '3210';
  }

  // refs: https://github.com/lobehub/lobe-chat/pull/5866
  // new handle segment rewrite: /${route}${originalPathname}
  // / -> /zh-CN__0__dark
  // /discover -> /zh-CN__0__dark/discover
  const nextPathname = `/${route}` + (url.pathname === '/' ? '' : url.pathname);
  const nextURL = appEnv.MIDDLEWARE_REWRITE_THROUGH_LOCAL
    ? urlJoin(url.origin, nextPathname)
    : nextPathname;

  console.log(`[rewrite] ${url.pathname} -> ${nextURL}`);

  url.pathname = nextPathname;

  return NextResponse.rewrite(url, { status: 200 });
};

// Initialize an Edge compatible NextAuth middleware
const nextAuthMiddleware = NextAuthEdge.auth((req) => {
  const response = defaultMiddleware(req);

  // Just check if session exists
  const session = req.auth;

  // Check if next-auth throws errors
  // refs: https://github.com/lobehub/lobe-chat/pull/1323
  const isLoggedIn = !!session?.expires;

  // Remove & amend OAuth authorized header
  response.headers.delete(OAUTH_AUTHORIZED);
  if (isLoggedIn) {
    response.headers.set(OAUTH_AUTHORIZED, 'true');
  }

  return response;
});

const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
  '/files(.*)',
  '/onboard(.*)',
  // ↓ cloud ↓
]);

const clerkAuthMiddleware = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect();

    return defaultMiddleware(req);
  },
  {
    // https://github.com/lobehub/lobe-chat/pull/3084
    clockSkewInMs: 60 * 60 * 1000,
    signInUrl: '/login',
    signUpUrl: '/signup',
  },
);

export default authEnv.NEXT_PUBLIC_ENABLE_CLERK_AUTH
  ? clerkAuthMiddleware
  : authEnv.NEXT_PUBLIC_ENABLE_NEXT_AUTH
    ? nextAuthMiddleware
    : defaultMiddleware;

// Middleware function
export async function middleware(request: NextRequest) {
  // Skip non-API requests
  if (!request.url.includes('/api/chat')) {
    return NextResponse.next();
  }

  // Only track POST requests to chat endpoints
  if (request.method !== 'POST') {
    return NextResponse.next();
  }
  
  // Extract user ID from auth header or cookie
  const userId = request.headers.get('x-user-id') || 
                 request.cookies.get('user_id')?.value || 
                 'anonymous';

  // Clone the request to read its body
  try {
    const requestClone = request.clone();
    const requestBody = await requestClone.json();
    
    // Record the request (input/prompt) information
    const promptData = {
      type: 'prompt',
      model: requestBody.model,
      provider: requestBody.provider || 'unknown',
      userId,
      messageId: requestBody.messageId || crypto.randomUUID(),
      sessionId: requestBody.sessionId,
      promptLength: JSON.stringify(requestBody.messages || []).length,
      stream: !!requestBody.stream
    };
    
    appendLog(userId, promptData);
  } catch (e) {
    console.error('Failed to process request for usage tracking:', e);
  }
  
  // Continue with the normal request flow
  return NextResponse.next();
}

// Configure which paths this middleware applies to
export const configUsage = {
  matcher: ['/api/chat/:path*']
};
