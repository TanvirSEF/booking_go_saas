export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

export interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: DeviceType;
}

/**
 * Lightweight, zero-dependency user-agent parser.
 */
export function parseUserAgent(ua: string = ''): ParsedUserAgent {
  const uaLower = ua.toLowerCase();

  // 1. Detect Bots
  if (
    uaLower.includes('bot') ||
    uaLower.includes('crawler') ||
    uaLower.includes('spider') ||
    uaLower.includes('crawling')
  ) {
    return {
      browser: 'Bot/Crawler',
      os: 'Unknown',
      deviceType: 'bot',
    };
  }

  // 2. Detect Operating System
  let os = 'Unknown OS';
  if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
    os = 'iOS';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    os = 'macOS';
  } else if (uaLower.includes('android')) {
    os = 'Android';
  } else if (uaLower.includes('windows') || uaLower.includes('win32') || uaLower.includes('win64')) {
    os = 'Windows';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
  }

  // 3. Detect Device Type
  let deviceType: DeviceType = 'desktop';
  if (uaLower.includes('ipad') || (uaLower.includes('tablet') && !uaLower.includes('mobile'))) {
    deviceType = 'tablet';
  } else if (
    uaLower.includes('mobile') ||
    uaLower.includes('iphone') ||
    uaLower.includes('ipod') ||
    (uaLower.includes('android') && !uaLower.includes('tablet'))
  ) {
    deviceType = 'mobile';
  }

  // 4. Detect Browser
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('OPR/') || ua.includes('Opera')) {
    browser = 'Opera';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browser = 'Safari';
  } else if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  }

  return {
    browser,
    os,
    deviceType,
  };
}

/**
 * Extracts client IP address from request headers with proxy support.
 */
export function getClientIp(
  headers: Headers | Record<string, string | string[] | undefined> | null
): string {
  if (!headers) return '127.0.0.1';

  let rawHeader = '';
  if (typeof (headers as Headers).get === 'function') {
    const h = headers as Headers;
    rawHeader =
      h.get('cf-connecting-ip') ||
      h.get('x-real-ip') ||
      h.get('x-forwarded-for') ||
      '';
  } else {
    const h = headers as Record<string, string | string[] | undefined>;
    const cf = h['cf-connecting-ip'];
    const xr = h['x-real-ip'];
    const xf = h['x-forwarded-for'];
    rawHeader = (Array.isArray(cf) ? cf[0] : cf) ||
      (Array.isArray(xr) ? xr[0] : xr) ||
      (Array.isArray(xf) ? xf[0] : xf) ||
      '';
  }

  if (!rawHeader) return '127.0.0.1';

  // x-forwarded-for may contain multiple IPs (client, proxy1, proxy2...)
  const firstIp = rawHeader.split(',')[0].trim();
  return firstIp || '127.0.0.1';
}
