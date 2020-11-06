
## Introduction

**yar** add session support to hapi - a persistent state across multiple browser requests using an [iron](https://github.com/hapijs/iron) encrypted cookie and server-side storage. **yar** tries to fit session data into a session cookie based  on a configured maximum size. If the content is too big to fit, it uses server storage via the [hapi plugin cache](http://hapi.dev/api#servercacheoptions) interface.

### Differences from @hapi/cookie

The **@hapi/cookie** plugin provides similar facilities to **yar**. The approach of the two projects does differ in some regards, though.  
1. **yar** is focused on session support, and does not require that a user be logged in to have a session. **@hapi/cookie** only provides session storage for logged in users.  If you need session handling for non-authenticated users, use **yar**.
1. **yar** is capable of handling larger data sizes without any additional setup.  If your session data gets larger than cookies can handle **yar** will push the data out to the server cache for you.  By default this is memory storage, but can be any [catbox](https://github.com/hapijs/catbox) supported cache storage, including mongo, redis, local disk, and more.  **@hapi/cookie** can support larger session size as well, but requires you to handle connecting the cookie based session with your external data storage.

## Example

For example, the first handler sets a session key and the second gets it:
```js
let handler1 = (request, reply) => {

    request.yar.set('example', { key: 'value' });

    return null;
};

let handler2 = (request, reply) => {

    const example = request.yar.get('example');
    return example.key;     // Will send back 'value'
};
```

The plugin requires a password for encryption that must be at least 32 characters long:
```js
let options = {
    storeBlank: false,
    cookieOptions: {
        password: 'the-password-must-be-at-least-32-characters-long',
        isSecure: true
    }
};
/*
Please note that there are other default cookie options that can impact your security.
Please look at the description of the cookie options below to make sure this is doing
what you expect.
*/

const server = new Hapi.Server();

try {
  await server.register({
      plugin: require('@hapi/yar'),
      options: options
  });
} catch(err) {
    console.error(err);
}

await server.start();
```

## Password considerations

Keep in mind some things in regard to your password:

1. It should never be committed to the repository or hard coded in your code.  Instead pass the password via environment variables or some other server configuration management option.
1. In some situations it is possible that your password could be attacked remotely.  So choose a password that is randomly generated.  Use a random password generator to create something rather than creating your own.  Make sure it is long and includes special characters.
1. Consider rotating your cookie session password on a regular basis.

## Cookie Options

You can read about more cookie options in the [cookie options](#options) section.

### isSecure

Set `isSecure` (default `true`) to `false` if you are using standard http. Take care to do this in development mode only though. You don't want to use cookies sent over insecure channels for session management.  One way to take care of this is to use the `NODE_ENV` environment variable like this:

```js
let options = {
    cookieOptions: {
        isSecure: process.env.NODE_ENV !== 'development',
        ...
    }
};
```

### ignoreErrors

`ignoreErrors` (default `true`) tells hapi that it should not respond with a HTTP 400 error if the session cookie cannot decrypt.  This could happen if the cookie is changed on the client, or more likely, if you change the cookie password in your settings.  If you want to make this condition send an error like it did in prior versions, change this to `false`, but be aware that if you change your cookie password you will cause 400 errors to be returned to end users.  In that case you should probably change this back to true for a short time to allow session cookies to get reset for the best user experience.

You may turn this off, `false`, and try to use the hapi route state config option of `failAction` to instead get an event whenever a bad session cookie is encountered.  This can allow more sophisticated handling strategies or even allow for mitigation of brute force attacks on your cookie password.  See [server.state](http://hapi.dev/api#serverstatename-options) documentation for more details.

### clearInvalid

`clearInvalid` (default `true`) tells hapi that if a session cookie is invalid for any reason, to clear it from the browser.  This prevents hapi from having to reprocess the bad cookie on future requests.  In general you'll probably want this on, but if you'd prefer that session cookies be dealt with in some other way you may set this to `false`.

## Options

- `name` - determines the name of the cookie used to store session information. Defaults to _session_.
- `maxCookieSize` - maximum cookie size before using server-side storage. Defaults to 1K. Set to zero to always use server-side storage.
- `storeBlank` - determines whether to store empty session before they've been modified. Defaults to _true_.
- `errorOnCacheNotReady` - will cause yar to throw an exception if trying to persist to cache when the cache is unavailable. Setting this to false will allow applications using yar to run uninterrupted if the cache is not ready (however sessions will not be saving). Defaults to _true_.
- `cache` - **hapi** [cache options](https://hapi.dev/api#servercacheoptions) which includes
  (among other options):
    - `expiresIn` - server-side storage expiration (defaults to 1 day).
- `cookieOptions` - the configuration for cookie-specific features:
    - `password` - (Required) used to encrypt and sign the cookie data.
    - `path` - determines the cookie path. Defaults to _'/'_.
    - `isSameSite` - enables the `same-site` cookie parameter.  Default to 'Lax'.  Can be `'Strict'|'Lax'|'None'|false`.
    - `isSecure` - determines whether or not to transfer using TLS/SSL. Defaults to _true_.
    - `isHttpOnly` - determines whether or not to set HttpOnly option in cookie. Defaults to _false_.
    - `ttl` - sets the time for the cookie to live in the browser, in milliseconds.  Defaults to null (session time-life - cookies are deleted when the browser is closed).
    - `contextualize` - a function using the signature `async function(definition, request)` used to override a request-specific cookie settings where:
        - `definition` - a copy of the `options` to be used for formatting the cookie that can be manipulated by the function to customize the request cookie header. Note that changing the `definition.contextualize` property will be ignored.
        - `request` - the current request object.
- `customSessionIDGenerator` - an optional function to create custom session IDs. Must return a string and have the signature `function (request)` where:
    - `request` - (optional) is the original **request** received from the client.

### Route Options
You can also add these options on a route per route basis at `config.plugins.yar`:

- `skip` - a boolean value which, if true, means no session with be attached to the request (defaults to false).


### Methods

**yar** adds the `yar` property to every request object and initializes the `yar.id` on the first request from each browser. The `request.yar` interface provides the following methods:

- `reset()` - clears the session and assigns a new session id.
- `set(key, value)` - assigns a value (string, object, etc) to a given key which will persist across requests.  Returns the value.
- `set(keysObject)` - assigns values to multiple keys using each 'keysObject' top-level property. Returns the keysObject.
- `get(key, clear)` - retrieve value using a key. If 'clear' is 'true', key is cleared on return.
- `clear(key)` - clears key.
- `touch()` - Manually notify the session of changes (when using `get()` and changing the content of the returned reference directly without calling `set()`).
- `flash(type, message, isOverride)` - stores volatile data - data that should be deleted once read. When given no arguments, it will return all of the flash messages and delete the originals. When given only a type, it will return all of the flash messages of that type and delete the originals. When given a type and a message, it will set or append that message to the given type. 'isOverride' used to indicate that the message provided should replace any existing value instead of being appended to it (defaults to false).
- `lazy(enabled)` - if set to 'true', enables lazy mode. In lazy mode, `request.yar` can be modified directly (e.g. setting `request.yar.myKey` to an object value), and those keys will be stored and loaded back. Lazy mode isn't as fast as the normal get/set because it has to store the session state on every responses regardless of any changes being made.
- `await commit(h)` - used to manually prepare the session state and commit it into the response when the response is taken over in an `onPreResponse` handler. Normally, the **yar** `onPreRespinse` handler performs the commit, but if an application extension handler takes over, **yar** doesn't get a chance to commit the state before the response goes out. The method requires the hapi `h` toolkit argument available in the extension handler.

**yar** adds the `yar` property to the server instance. The `server.yar` interface provides the following methods:

- `revoke(id)` - revokes the specified session.
