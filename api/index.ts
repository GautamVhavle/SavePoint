import { getRequestListener } from '@hono/node-server';

import { createApp } from './_lib/app.js';

/**
 * Vercel's Node.js runtime invokes the default export with Node's
 * `(IncomingMessage, ServerResponse)` pair, so `hono/vercel` — which expects a
 * WHATWG `Request` — cannot be used here. `getRequestListener` bridges the two:
 * it builds a real `Request`, runs the Hono app, and streams the `Response`
 * back onto the Node socket.
 *
 * `bodyParser` is disabled so the adapter receives the untouched request stream
 * and can hand Hono an accurate body.
 */
export const config = { api: { bodyParser: false } };

export default getRequestListener(createApp().fetch);
