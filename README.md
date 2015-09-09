![yar Logo](https://raw.github.com/hapijs/yar/master/images/yar.png)

A [**hapi**](https://github.com/hapijs/hapi) session plugin and cookie jar

[![npm version](https://badge.fury.io/js/yar.svg)](http://badge.fury.io/js/yar)
[![Build Status](https://secure.travis-ci.org/hapijs/yar.png)](http://travis-ci.org/hapijs/yar)
[![Dependency Status](https://david-dm.org/hapijs/yar.svg)](https://david-dm.org/hapijs/yar)

[![Join the chat at https://gitter.im/hapijs/yar](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/hapijs/yar?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw)

## Install

    $ npm install yar

## Upgrading to 4.x

Please note that version 4.x has a small breaking change.  This probably doesn't affect most people, but it's worth noting.  In version 3.x if a cookie was invalid, either due to corruption or change in encryption password, the server would respond with a HTTP 400 error.  Starting in 4.x the default settings avoid this and instead silently drop the invalid cookie.  This is probably the desired behavior, but since it's different you should be aware of it when upgrading.


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

The plugin requires a password for encryption:
```javascript
var options = {
    storeBlank: false,
    cookieOptions: {
        password: 'password',
        isSecure: true
    }
};
/*
Please note that there are other default cookie options that can impact your security.
Please look at the description of the cookie options below to make sure this is doing
what you expect.
*/

var server = new Hapi.Server();

server.register({
    register: require('yar'),
    options: options
}, function (err) { });
```

## Password considerations

Keep in mind some things in regard to your password:

1. It should never be committed to the repository or hard coded in your code.  Instead pass the password via environment variables or some other server configuration management option.
1. In some situations it is possible that your password could be attacked remotely.  So choose a password that is randomly generated.  Use a random password generator to create something rather than creating your own.  Make sure it is long and includes special characters.
1. Consider rotating your cookie session password on a regular basis.

## Cookie Options

You can read about more cookie options in the [Api](API.md).

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

`ignoreErrors` (default `true`) tells Hapi that it should not respond with a HTTP 400 error if the session cookie cannot decrypt.  This could happen if the cookie is changed on the client, or more likely, if you change the cookie password in your settings.  If you want to make this condition send an error like it did in prior versions, change this to `false`, but be aware that if you change your cookie password you will cause 400 errors to be returned to end users.  In that case you should probably change this back to true for a short time to allow session cookies to get reset for the best user experience.

You may turn this off, `false`, and try to use the Hapi route state config option of `failAction` to instead get an event whenever a bad session cookie is encountered.  This can allow more sophisticated handling strategies or even allow for mitigation of brute force attacks on your cookie password.  See [server.state](http://hapijs.com/api#serverstatename-options) documentation for more details.

### clearInvalid

`clearInvalid` (default `true`) tells Hapi that if a session cookie is invalid for any reason, to clear it from the browser.  This prevents Hapi from having to reprocess the bad cookie on future requests.  In general you'll probably want this on, but if you'd prefer that session cookies be dealt with in some other way you may set this to `false`.

## Hapi-Auth-Cookie

There's a similar project called [Hapi-Auth-Cookie](https://github.com/hapijs/hapi-auth-cookie) that achieves similar ends to *yar*.  If you want some additional options around authentication then you should take a look there.

## API Reference

[Api Reference](API.md)
