<a href="https://github.com/spumko"><img src="https://raw.github.com/spumko/spumko/master/images/from.png" align="right" /></a>
![yar Logo](https://raw.github.com/spumko/yar/master/images/yar.png)

A [**hapi**](https://github.com/spumko/hapi) cookie jar

[![Build Status](https://secure.travis-ci.org/spumko/yar.png)](http://travis-ci.org/spumko/yar)


## Install

    $ npm install yar



## Usage

The ***yar*** plugin adds a simple way to set a persistant state (using an [Iron](https://github.com/hueniverse/iron) encrypted cookie) across requests.
It has support for session management - either stored on the client via cookie, in server memory, or using an external database (via custom storage code).

For example, the first handler sets the jar content and the second utilizes it:
```javascript
var handler1 = function () {

    this.plugins.yar = {
        key: 'value'
    };

    return this.reply();
};

var handler2 = function () {

    this.reply(this.state.yar.key);     // Will send back 'value'
};
```

The plugin requires a password for encryption, and the `ext` permission:
```javascript
var options = {
    permissions: {
        ext: true                   // Required
    },
    plugin: {
        name: 'yar' ,               // Optional, overrides cookie name. Defaults to 'yar'. Doesn't affect 'plugins.yar'.
        isSingleUse: false,         // Optional, clears jar after one request. Defaults to false.
        cookieOptions: {
            password: 'password',   // Required
            isSecure: true          // Optional, any supported cookie options except `encoding`
        }
    }
};

var server = new Hapi.Server();

server.plugin().require('yar', options, function (err) { });
```


## API Reference

### Options

- `name` - determines what name to use for the cookie and module references. Defaults to _yar_. Should not have to modify this unless it conflicts with another plugin named yar.
- `isSingleUse` - determines whether the cookie should be deleted on next request. Defaults to _false_.
- `cookieOptions` - the configuration for cookie-specific features
    - `password` - (Required) used to hash and secure the cookie data
    - `path` - determines the cookie path. Defaults to _'/'_.
    - `isSecure` - determines whether or not to transfer using TLS/SSL. Defaults to _false_.
- `session` - determines whether to enable the more robust session features (any non false-y values will enable it). Defaults to _false_.
    - `key` - determines how to access the `request.session` object. Defaults to _'session'_.
    - `sidKey` - determines what key to use for storing session id in session object. Defaults to _'sid'_.
    - `startKey` - determines what key to use for storing server start time in session object (used for identifying stale cookies). Defaults to _'sst'_.
    - `maxLen` - determines the maximum string length allowed in a cookie before falling back to MemoryStore
    - `store` - setting this to an MemoryStore compatible interface will allow session data to be stored externally. Defaults to _null_.
    

### Sessions

More robust session support is included in yar but it is not enabled by default. To enable, simple set the plugin option session to true:

```javascript
var options = {
    "cookieOptions": {
        "password": "worldofwalmart"
    },
    "session": true
};
```


#### Methods

This will enable several request-level methods and parameters:

* request.session
* request.flash

##### request.session

Session support will enable the `request.session` object. Modifications to this object will persist between requests for a given user. The objects are not shared between users. The objects are stored entirely within the user cookie **UNLESS** the size exceeds `session.maxLen` - at which point, they will be stored on the server in RAM.

**Basic example**

```javascript
server.addRoute({
    method: 'GET',
    path: '/',
    config: {
        handler: function (request) {

            if (!request.session.loggedIn) {
                request.session.loggedIn = true; // logging you in
                request.reply.redirect('/').send();
            }
            else {
                request.reply("You are logged in");
            }
        }
    }
});
```

##### request.flash(type, message)

Session support will also enable the `flash` function. The flash function is used to store volatile data - data that should be deleted once read.

When given no arguments, it will return all of the flash messages and delete the originals.

When given only a type, it will return all of the flash messages of that type and delete the originals.

When given a type and a message, it will set or append that message to the given type.