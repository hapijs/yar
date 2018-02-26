# Yar

A [**hapi**](https://github.com/hapijs/hapi) session manager

[![npm version](https://badge.fury.io/js/yar.svg)](http://badge.fury.io/js/yar)
[![Build Status](https://secure.travis-ci.org/hapijs/yar.png)](http://travis-ci.org/hapijs/yar)

Lead Maintainer: [Eran Hammer](https://github.com/hueniverse)

The ***yar*** [Hapi](https://github.com/hapijs/hapi) plugin adds friendly session support to Hapi - a persistent state across multiple browser requests using an [iron](https://github.com/hueniverse/iron) encrypted cookie and server-side storage. **yar** tries to fit session data into a session cookie based  on a configured maximum size. If the content is too big to fit, it uses server storage via the [hapi plugin cache](http://hapijs.com/api#servercacheoptions) interface.

## Hapi-Auth-Cookie

There's another project called [Hapi-Auth-Cookie](https://github.com/hapijs/hapi-auth-cookie) that achieves similar ends to *yar*.  The approach of the two projects does differ in some regards, though.  
1. Yar is laser focused on session support, and does not require that a user be logged in to have a session. Hapi-Auth-Cookie only provides session storage for logged in users.  If you need session handling for non-authenticated users, use Yar.
1. Yar is capable of handling larger data sizes without any additional setup.  If your session data gets larger than cookies can handle Yar will push the data out to the server cache for you.  By default this is memory storage, but can be any [catbox](https://github.com/hapijs/catbox) supported cache storage, including mongo, redis, local disk, and more.  Hapi-Auth-Cookie can support larger session size as well, but requires you to handle connecting the cookie based session with your external data storage.

## Install

    $ npm install yar --save

## Usage

For example, the first handler sets a session key and the second gets it:
```javascript
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
```javascript
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
      plugin: require('yar'),
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

You can read about more cookie options in the [Api](API.md).

### isSecure

Set `isSecure` (default `true`) to `false` if you are using standard http. Take care to do this in development mode only though. You don't want to use cookies sent over insecure channels for session management.  One way to take care of this is to use the `NODE_ENV` environment variable like this:

```javascript
let options = {
    cookieOptions: {
        isSecure: process.env.NODE_ENV !== 'development',
        ...
    }
};
```

### ignoreErrors

`ignoreErrors` (default `true`) tells Hapi that it should not respond with a HTTP 400 error if the session cookie cannot decrypt.  This could happen if the cookie is changed on the client, or more likely, if you change the cookie password in your settings.  If you want to make this condition send an error like it did in prior versions, change this to `false`, but be aware that if you change your cookie password you will cause 400 errors to be returned to end users.  In that case you should probably change this back to true for a short time to allow session cookies to get reset for the best user experience.

You may turn this off, `false`, and try to use the Hapi route state config option of `failAction` to instead get an event whenever a bad session cookie is encountered.  This can allow more sophisticated handling strategies or even allow for mitigation of brute force attacks on your cookie password.  See [server.state](http://hapijs.com/api#serverstatename-options) documentation for more details.

### clearInvalid

`clearInvalid` (default `true`) tells Hapi that if a session cookie is invalid for any reason, to clear it from the browser.  This prevents Hapi from having to reprocess the bad cookie on future requests.  In general you'll probably want this on, but if you'd prefer that session cookies be dealt with in some other way you may set this to `false`.

## API Reference

[Api Reference](API.md)
