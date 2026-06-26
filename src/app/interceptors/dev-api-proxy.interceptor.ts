import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const PROXY_HINT =
  'Dev API proxy is not active. Stop the dev server, run npm start from Player-DJGogi, then reload.';

function isHtmlInsteadOfJson(err: HttpErrorResponse): boolean {
  const nested = err.error as { error?: unknown; text?: string } | null;
  if (nested?.error instanceof SyntaxError) {
    return true;
  }
  if (typeof nested?.text === 'string' && /^\s*<!doctype/i.test(nested.text)) {
    return true;
  }
  return typeof err.error === 'string' && /^\s*<!doctype/i.test(err.error);
}

/** Surfaces a clear message when `/gogi-api` hits the SPA instead of the backend proxy. */
export const devApiProxyHintInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && req.url.includes('/gogi-api/') && isHtmlInsteadOfJson(err)) {
        return throwError(
          () =>
            new HttpErrorResponse({
              error: PROXY_HINT,
              headers: err.headers,
              status: err.status,
              statusText: err.statusText,
              url: err.url ?? undefined
            })
        );
      }
      return throwError(() => err);
    })
  );
