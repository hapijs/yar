# Yar

## API Reference

### Options

- `name` - determines the name of the cookie used to store session information. Defaults to _session_.
- `maxCookieSize` - maximum cookie size before using server-side storage. Defaults to 1K. Set to zero to always use server-side storage.
- `storeBlank` - determines whether to store empty session before they've been modified. Defaults to _true_.
- `errorOnCacheNotReady` - will cause yar to throw an exception if trying to persist to cache when the cache is unavailable. Setting this to false will allow applications using yar to run uninterrupted if the cache is not ready (however sessions will not be saving). Defaults to _true_.
- `cache` - **hapi** [cache options](https://github.com/hapijs/hapi/blob/master/API.md#servercacheoptions) which includes
  (among other options):
    - `expiresIn` - server-side storage expiration (defaults to 1 day).
- `cookieOptions` - the configuration for cookie-specific features:
    - `password` - (Required) used to encrypt and sign the cookie data.
    - `path` - determines the cookie path. Defaults to _'/'_.
    - `isSameSite` - enables the `same-site` cookie parameter.  Default to 'Lax'.  Can be `'Strict'|'Lax'|false`.
    - `isSecure` - determines whether or not to transfer using TLS/SSL. Defaults to _true_.
    - `isHttpOnly` - determines whether or not to set HttpOnly option in cookie. Defaults to _false_.
    - `ttl` - sets the time for the cookie to live in the browser, in milliseconds.  Defaults to null (session time-life - cookies are deleted when the browser is closed).
- `customSessionIDGenerator` - an optional function to create custom session IDs. Must retun a string and have the signature `function (request)` where:
    - `request` - (optional) is the original **request** received from the client.

#### Route Options
You can also add these options on a route per route basis at `config.plugins.yar`:
    - `skip` - a boolean value which, if true, means no session with be attached to the request (defaults to false).


#### Methods

**yar** adds the `yar` property to every request object and initializes the `yar.id` on the first request from each browser. The `request.yar` interface provides the following methods:

- `reset()` - clears the session and assigns a new session id.
- `set(key, value)` - assigns a value (string, object, etc) to a given key which will persist across requests.  Returns the value.
- `set(keysObject)` - assigns values to multiple keys using each 'keysObject' top-level property. Returns the keysObject.
- `get(key, clear)` - retrieve value using a key. If 'clear' is 'true', key is cleared on return.
- `clear(key)` - clears key.
- `touch()` - Manually notify the session of changes (when using `get()` and changing the content of the returned reference directly without calling `set()`).
- `flash(type, message, isOverride)` - stores volatile data - data that should be deleted once read. When given no arguments, it will return all of the flash messages and delete the originals. When given only a type, it will return all of the flash messages of that type and delete the originals. When given a type and a message, it will set or append that message to the given type. 'isOverride' used to indicate that the message provided should replace any existing value instead of being appended to it (defaults to false).
- `lazy(enabled)` - if set to 'true', enables lazy mode. In lazy mode, `request.yar` can be modified directly (e.g. setting `request.yar.myKey` to an object value), and those keys will be stored and loaded back. Lazy mode isn't as fast as the normal get/set because it has to store the session state on every responses regardless of any changes being made.

**yar** adds the `yar` property to the server instance. The `server.yar` interface provides the following methods:

- `revoke(id)` - revokes the specified session.