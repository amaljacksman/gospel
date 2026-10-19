interface Env {
  ASSETS: Fetcher;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (url.pathname === '/data-deletion')
      return Response.redirect(`${url.origin}/#data-deletion`, 302);
    if (url.pathname === '/privacy' || url.pathname === '/privacy-policy')
      return Response.redirect(`${url.origin}/`, 302);
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    );
    response.headers.set('Cache-Control', 'public, max-age=300');
    return response;
  },
} satisfies ExportedHandler<Env>;
