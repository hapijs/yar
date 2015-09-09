![yar Logo](https://raw.github.com/hapijs/yar/master/images/yar.png)

A [**hapi**](https://github.com/hapijs/hapi) session plugin and cookie jar

[![Build Status](https://secure.travis-ci.org/hapijs/yar.png)](http://travis-ci.org/hapijs/yar)

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw)

## Install

    $ npm install yar


## Usage

The ***yar*** [hapi](https://github.com/hapijs/hapi) plugin adds session support - a persistant state across multiple browser
requests using an [iron](https://github.com/hueniverse/iron) encrypted cookie and server-side storage. **yar** tries to fit
session data into a session cookie based  on a configured maximum size. If the content is too big to fit, it uses local storage
via the hapi plugin cache interface.

For example, the first handler sets a session key and the second gets it:
```javascript
var handler1 = function (request, reply) {

    request.session.set('example', { key: 'value' });
    return reply();
};

var handler2 = function (request, reply) {

    var example = request.session.get('example');
    reply(example.key);     // Will send back 'value'
};
```

The plugin requires a password for encryption, and the `ext` permission:
```javascript
var options = {
    cookieOptions: {
        password: 'password',
        isSecure: true,
        ignoreErrors: true, // Please see the explanation below for consequences
        clearInvalid: true // Please see the explanation below for consequences
    }
};

var server = new Hapi.Server();

server.register({
    register: require('yar'),
    options: options
}, function (err) { });
```

## Cookie Options

### isSecure

Set `isSecure` (default `true`) to `false` if you are using standard http. Take care to do this in development mode only though. You don't want to use cookies sent over insecure channels for session management.  One way to take care of this is to use the `NODE_ENV` environment variable like this:

```javascript
var options = {
    cookieOptions: {
        isSecure: process.env.NODE_ENV === 'development' ? false : true,
        ...
    }
};
```

### ignoreErrors

`ignoreErrors` (default `true`) tells Hapi that it should not respond with a HTTP 400 error if the session cookie cannot decrypt.  This could happen if the cookie is changed on the client, or more likely, if you change the cookie password in your settings.  If you want to make this condition send an error, change this to `false`, but be aware that if you change your cookie password you will cause 400 errors to be returned to end users.  You should probably change this back to true for a short time to allow session cookies to get reset for the best user experience.

You may turn this off, `false`, and try to use the Hapi route state config option of `failAction` to instead get an event whenever a bad session cookie is encountered.  This can allow more sophisticated handling strategies or even allow for mitigation of brute force attacks on your cookie password.  See [server.state](http://hapijs.com/api#serverstatename-options) documentation for more details.

### clearInvalid

`clearInvalid` (default `true`) tells Hapi that if a session cookie is invalid for any reason, to clear it from the browser.  This prevents Hapi from having to reprocess the bad cookie on future requests.  In general you'll probably want this on, but if you'd prefer that session cookies be dealt with in some other way you may set this to `false`.


## API Reference

### Options

- `name` - determines the name of the cookie used to store session information. Defaults to _session_.
- `maxCookieSize` - maximum cookie size before using server-side storage. Defaults to 1K. Set to zero to always use server-side storage.
- `cache` - **hapi** [cache options](https://github.com/hapijs/hapi/blob/master/API.md#servercacheoptions) which includes
  (among other options):
    - `expiresIn` - server-side storage expiration (defaults to 1 day).
- `cookieOptions` - the configuration for cookie-specific features:
    - `password` - (Required) used to encrypt and sign the cookie data.
    - `path` - determines the cookie path. Defaults to _'/'_.
    - `isSecure` - determines whether or not to transfer using TLS/SSL. Defaults to _true_.
    - `isHttpOnly` - determines whether or not to set HttpOnly option in cookie. Defaults to _false_.
    - `ttl` - sets the time for the cookie to live in the browser, in milliseconds.  Defaults to null (session time-life - cookies are deleted when the browser is closed).


#### Methods

**yar** adds the `session` property to every request object and initializes the `session.id` on the first request from each browser. The `request.session` interface provides the following methods:

- `reset()` - clears the session and assigns a new session id.
- `set(key, value)` - assigns a value (string, object, etc) to a given key which will persist across requests.
- `set(keysObject)` - assigns values to multiple keys using each 'keysObject' top-level property.
- `get(key, clear)` - retreive value using a key. If 'clear' is 'true', key is cleared on return.
- `clear(key)` - clears key.
- `touch()` - Manually notify the session of changes (when using `get()` and changing the content of the returned reference directly without calling `set()`).
- `flash(type, message, isOverride)` - stores volatile data - data that should be deleted once read. When given no arguments, it will return all of the flash messages and delete the originals. When given only a type, it will return all of the flash messages of that type and delete the originals. When given a type and a message, it will set or append that message to the given type. 'isOverride' used to indicate that the message provided should replace any existing value instead of being appended to it (defaults to false).
- `lazy(enabled)` - if set to 'true', enables lazy mode. In lazy mode, `request.session` can be modified directly (e.g. setting `request.session.myKey` to an object value), and those keys will be stored and loaded back. Lazy mode isn't as fast as the normal get/set because it has to store the session state on every responses regardless of any changes being made.
