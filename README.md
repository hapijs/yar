<a href="https://github.com/walmartlabs/blammo"><img src="https://raw.github.com/walmartlabs/blammo/master/images/from.png" align="right" /></a>
![yar Logo](https://raw.github.com/walmartlabs/yar/master/images/yar.png)

A [**hapi**](https://github.com/walmartlabs/hapi) cookie jar

[![Build Status](https://secure.travis-ci.org/walmartlabs/yar.png)](http://travis-ci.org/walmartlabs/yar)

The ***yar*** plugin adds a simple was to set a persistant state (using an [Iron](https://github.com/hueniverse/iron) encrypted cookie) across requests.
It is not designed for session management but to supplement an active session with transactional information.

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
        options: {
            password: 'password',   // Required
            isSecure: true          // Optional, any supported cookie options except `encoding`
        }
    }
};

var server = new Hapi.Server();

server.plugin().require('yar', options, function (err) { });
```
