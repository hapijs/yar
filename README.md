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
        password: 'password'
    }
};

var server = new Hapi.Server();

server.register({
    register: require('yar'),
    options: options
}, function (err) { });
```

Note: Add `isSecure: false` to the `cookieOptions` if using standard http. Take care to do this in development mode only though. You don't want to use cookies sent over insecure channels for session management.

### Hapi-Auth-Cookie

There's a similar project called [Hapi-Auth-Cookie](https://github.com/hapijs/hapi-auth-cookie) that achieves similar ends to *yar*.  If you want some additional options around authentication then you should take a look there.

## API Reference

[Api Reference](API.md)
