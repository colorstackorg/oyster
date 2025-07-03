/**
 * We are extending the `Response` class in order to automatically set some
 * security headers that before we got for free with Express' `helmet` package.
 */
export class BunResponse extends Response {
  constructor(
    body?: BodyInit | null | undefined,
    init?: ResponseInit | undefined
  ) {
    super(body, init);
    this.secureHeaders();
  }

  static json(data: any, init: ResponseInit = {}): BunResponse {
    const headers = new Headers(init.headers);

    headers.set('Content-Type', 'application/json');

    return new BunResponse(JSON.stringify(data), {
      ...init,
      headers,
    });
  }

  static redirect(url: string | URL, status: number = 302): BunResponse {
    return new BunResponse(null, {
      status,
      headers: {
        Location: url.toString(),
      },
    });
  }

  /**
   * In lieu of the `helmet` package that we used to use when we were using
   * Express, we're manually setting the important security headers. For
   * the most part, we're using the defaults.
   *
   * @see https://www.npmjs.com/package/helmet
   */
  private secureHeaders() {
    // A powerful allow-list of what can happen on your page which mitigates
    // many attacks.
    this.headers.set(
      'Content-Security-Policy',
      "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;"
    );

    // Helps control what resources can be loaded cross-origin.
    this.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

    // Helps process-isolate your page.
    this.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

    // Blocks others from loading your resources cross-origin in some cases.
    this.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Provides a mechanism to allow web applications to isolate their origins
    // from other processes.
    this.headers.set('Origin-Agent-Cluster', '?1');

    // Controls what information is set in the Referer request header.
    this.headers.set('Referrer-Policy', 'no-referrer');

    // Tells browsers to prefer HTTPS instead of insecure HTTP.
    this.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );

    // Mitigates MIME type sniffing which can cause security issues.
    this.headers.set('X-Content-Type-Options', 'nosniff');

    // Helps control DNS prefetching, which can improve user privacy at the
    // expense of performance.
    this.headers.set('X-DNS-Prefetch-Control', 'off');

    // Specific to Internet Explorer 8. It forces potentially-unsafe downloads
    // to be saved, mitigating execution of HTML in your site's context.
    this.headers.set('X-Download-Options', 'noopen');

    // Helps you mitigate clickjacking attacks. This header is superseded by the
    // frame-ancestors Content Security Policy directive but is still useful on
    // old browsers or if no CSP is used.
    this.headers.set('X-Frame-Options', 'SAMEORIGIN');

    // Tells some clients (mostly Adobe products) your domain's policy for
    // loading cross-domain content.
    this.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // Disables browsers' buggy cross-site scripting filter.
    this.headers.set('X-XSS-Protection', '0');
  }
}
