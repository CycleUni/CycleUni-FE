const THRESHOLDS: Record<number, number> = {
  1: 5000,
  2: 13000,
  3: 20000,
};

// Cache-Control on the returned Response only governs the *browser's* cache.
// Cloudflare's edge/CDN cache does not automatically store dynamic
// Pages Functions responses just because a Cache-Control header is present —
// that has to be opted into explicitly via the Cache API, which is what the
// `caches.default.match`/`.put` calls below do. Without this, every request
// for the same book cover (from any visitor, anywhere) would re-run the
// zoom-cascade/size-check logic and re-fetch from Google/Open Library every
// single time, instead of being served instantly from Cloudflare's edge
// after the first successful lookup.
export const onRequestGet: PagesFunction = async (context) => {
  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached) {
    return cached;
  }

  const requestUrl = new URL(context.request.url);
  const src = requestUrl.searchParams.get('src');

  if (!src) {
    return new Response('Missing required "src" query parameter', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let srcUrl: URL;
  try {
    srcUrl = new URL(src);
    if (srcUrl.protocol !== 'http:' && srcUrl.protocol !== 'https:') {
      return new Response('Invalid "src" query parameter: protocol must be http or https', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  } catch {
    return new Response('Invalid "src" query parameter: malformed URL', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (srcUrl.hostname !== 'books.google.com' && srcUrl.hostname !== 'covers.openlibrary.org') {
    return new Response('Invalid "src" query parameter: unsupported host', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (srcUrl.hostname === 'covers.openlibrary.org') {
    try {
      const upstreamResponse = await fetch(srcUrl.toString());
      if (!upstreamResponse.ok) {
        return new Response(null, { status: 404 });
      }

      let byteLength = -1;
      let bodyBuffer: ArrayBuffer | null = null;

      const contentLengthHeader = upstreamResponse.headers.get('content-length');
      if (contentLengthHeader) {
        const parsedLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(parsedLength) && parsedLength >= 0) {
          byteLength = parsedLength;
        }
      }

      if (byteLength < 0) {
        bodyBuffer = await upstreamResponse.arrayBuffer();
        byteLength = bodyBuffer.byteLength;
      }

      if (byteLength < 100) {
        return new Response(null, { status: 404 });
      }

      if (!bodyBuffer) {
        bodyBuffer = await upstreamResponse.arrayBuffer();
      }

      if (bodyBuffer.byteLength < 100) {
        return new Response(null, { status: 404 });
      }

      const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
      const response = new Response(bodyBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=2592000, immutable',
        },
      });
      context.waitUntil(cache.put(context.request, response.clone()));
      return response;
    } catch {
      return new Response(null, { status: 404 });
    }
  }

  const zoomParam = srcUrl.searchParams.get('zoom');
  let initialZoom = 1;
  if (zoomParam) {
    const parsed = parseInt(zoomParam, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      initialZoom = Math.min(parsed, 3);
    }
  }

  for (let currentZoom = initialZoom; currentZoom >= 1; currentZoom--) {
    const threshold = THRESHOLDS[currentZoom] ?? 5000;
    const targetUrl = new URL(srcUrl.toString());
    targetUrl.searchParams.set('zoom', currentZoom.toString());

    try {
      const upstreamResponse = await fetch(targetUrl.toString());
      if (!upstreamResponse.ok) {
        continue;
      }

      let byteLength = -1;
      let bodyBuffer: ArrayBuffer | null = null;

      const contentLengthHeader = upstreamResponse.headers.get('content-length');
      if (contentLengthHeader) {
        const parsedLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(parsedLength) && parsedLength >= 0) {
          byteLength = parsedLength;
        }
      }

      if (byteLength < 0) {
        bodyBuffer = await upstreamResponse.arrayBuffer();
        byteLength = bodyBuffer.byteLength;
      }

      if (byteLength >= threshold) {
        if (!bodyBuffer) {
          bodyBuffer = await upstreamResponse.arrayBuffer();
        }

        if (bodyBuffer.byteLength < threshold) {
          continue;
        }

        const contentType = upstreamResponse.headers.get('content-type') || 'image/jpeg';
        const response = new Response(bodyBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=2592000, immutable',
          },
        });
        context.waitUntil(cache.put(context.request, response.clone()));
        return response;
      }
    } catch {
      continue;
    }
  }

  return new Response(null, {
    status: 404,
  });
};
