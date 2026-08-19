/**
 * dsh-read-image-view host entry: the plugin is browser-side only. Nothing is
 * mounted on the host; the entry exists so the package is a loader entry
 * the client-module scanner (dsh-client-modules) can discover and serve
 * under /plugins/dsh-read-image-view/client.js.
 *
 * The browser half (lib/client.js, declared via `dsh.client` in
 * package.json) registers a dedicated read_image row into the Tool-owned
 * keyed view slot and resolves the result's image through the durable
 * attachment store's session.attachment RPC.
 *
 * @module dsh-read-image-view
 */
export const name = "dsh-read-image-view";

/** No-op host half. @param _ctx - host context. @param _config - entry config. */
export function apply(_ctx, _config) {}
