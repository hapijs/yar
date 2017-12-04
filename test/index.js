'use strict';

// Load modules

const Boom = require('boom');
const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');

// Declare internals

const internals = {
    password: 'passwordmustbelongerthan32characterssowejustmakethislonger'
};


// Test shortcuts

const lab = exports.lab = Lab.script();
const {describe, it} = lab;
const expect = Code.expect;

it('sets session value then gets it back (store mode)', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    await server.register({plugin: require('../'), options: options});

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                let returnValue = request.yar.set('some', {value: '2'});

                expect(returnValue.value).to.equal('2');
                returnValue = request.yar.set('one', 'xyz');
                expect(returnValue).to.equal('xyz');

                request.yar.clear('one');

                return Object.keys(request.yar._store).length;
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                const some = request.yar.get('some');
                some.raw = 'access';

                request.yar.touch();

                return some.value;
            }
        },
        {
            method: 'GET', path: '/3', handler: async (request, h) => {

                const raw = request.yar.get('some').raw;

                request.yar.reset();

                return raw;
            }
        }
    ]);

    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.not.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('2');
            const header2 = res2.headers['set-cookie'];
            const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/3', headers: {cookie: cookie2[1]}}, (res3) => {
                expect(res3.result).to.equal('access');
                done();
            });
        });
    });
});

it('sets session value and wait till cache expires then fail to get it back', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        cache: {
            expiresIn: 1
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                request.yar.set('some', {value: '2'});
                request.yar.set('one', 'xyz');
                request.yar.clear('one');
                return Object.keys(request.yar._store).length;
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                const some = request.yar.get('some');
                return some;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.not.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        setTimeout(() => {

            server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

                expect(res2.result).to.equal(null);
                done();
            });
        }, 10);
    });
});

it('sets session value then gets it back (cookie mode)', async (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                request.yar.set('some', {value: '2'});
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                return request.yar.get('some').value;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('2');
            done();
        });
    });
});

it('sets session value then gets it back (hybrid mode)', async (done) => {

    const options = {
        maxCookieSize: 10,
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                request.yar.set('some', {value: '12345678901234567890'});
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                return request.yar.get('some').value;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('12345678901234567890');
            done();
        });
    });
});

it('sets session value then gets it back (lazy mode)', async (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                request.yar.lazy(true);
                request.yar.some = {value: '2'};
                request.yar._test = {value: '3'};
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                return request.yar.some.value;
            }
        },
        {
            method: 'GET', path: '/3', handler: (request, h) => {

                return request.yar._test;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('2');
            const header2 = res2.headers['set-cookie'];
            const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/3', headers: {cookie: cookie2[1]}}, (res3) => {

                expect(res3.result).to.be.null();
            });
            done();
        });
    });
});

it('no keys when in session (lazy mode)', async (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                request.yar.lazy(true);
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                return request.yar._store;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.be.empty();
            done();
        });
    });
});

it('sets session value then gets it back (clear)', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: async (request, h) => {

                const returnValue = request.yar.set({
                    some: '2',
                    and: 'thensome'
                });
                expect(returnValue.some).to.equal('2');
                expect(returnValue.and).to.equal('thensome');
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: async (request, h) => {

                const some = request.yar.get('some', true);
                return some;
            }
        },
        {
            method: 'GET', path: '/3', handler: async (request, h) => {

                const some = request.yar.get('some');
                return some || '3';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('2');
            const header2 = res2.headers['set-cookie'];
            const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/3', headers: {cookie: cookie2[1]}}, (res3) => {

                expect(res3.result).to.equal('3');
                done();
            });
        });
    });
});

it('returns 500 when storing cookie in invalid cache by default', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                request.yar.set('some', {value: '2'});
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                return request.yar.get('some');
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server._caches._default.client.stop();
        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.statusCode).to.equal(500);
            done();
        });
    });
});

it('fails setting session key/value because of bad key/value arguments', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server({debug: false});

    server.route([
        {
            method: 'GET', path: '/1', handler: (request) => {

                request.yar.set({'some': '2'}, '2');
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, reply) => {

                request.yar.set(45.68, '2');
                return '1';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.statusCode).to.equal(500);
        server.inject({method: 'GET', url: '/2'}, (res2) => {

            expect(res2.statusCode).to.equal(500);
            done();
        });
    });
});

it('fails setting session key/value because of failed cache set', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache.js');
    const setRestore = cache.prototype.set;
    cache.prototype.set = (key, value, ttl) => {
        return new Error('Error setting cache');
    };
    const hapiOptions = {
        cache: {
            engine: require('./test-cache.js')
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);

    const handler = (request, h) => {

        request.yar.set('some', 'value');

        return null;
    };

    server.route({method: 'GET', path: '/', handler});

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        expect(res.statusCode).to.equal(500);
        cache.prototype.set = setRestore;
    });
});

it('does not try to store session when cache not ready if errorOnCacheNotReady set to false', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');
    const getRestore = cache.prototype.get;
    const isReadyRestore = cache.prototype.isReady;

    cache.prototype.get = () => {
        console.log('Woa');
        return new Error('Error getting cache');
    };

    cache.prototype.isReady = () => {

        return false;
    };

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);

    const preHandler = (request, h) => {

        request.yar.set('some', 'value');
        return null;
    };

    const handler = (request, h) => {

        const some = request.yar.get('some');
        return some;
    };

    server.route({
        method: 'GET',
        path: '/',
        config: {
            pre: [
                {method: preHandler}
            ],
            handler
        }
    });

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('value');

        cache.prototype.get = getRestore;
        cache.prototype.isReady = isReadyRestore;

        done();
    });
});

it('fails loading session from invalid cache and returns 500', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache.js');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);

    server.route([
        {
            method: 'GET', path: '/', handler: (request, h) => {

                request.yar.set('some', 'value');
                return '1';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                handlerSpy();
                request.yar.set(45.68, '2');
                return '1';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('1');

        const getRestore = cache.prototype.get;
        const isReadyRestore = cache.prototype.isReady;

        cache.prototype.get = (callback) => {

            callback(new Error('Error getting cache'));
        };

        cache.prototype.isReady = () => {

            return false;
        };

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.statusCode).to.equal(500);
            cache.prototype.get = getRestore;
            cache.prototype.isReady = isReadyRestore;
            done();
        });
    });
});

it('does not load from cache if cache is not ready and errorOnCacheNotReady set to false', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);


    server.route([{
        method: 'GET', path: '/', handler: (request, h) => {

            request.yar.set('some', 'value');
            return null;
        }
    },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
        const isReadyRestore = cache.prototype.isReady;

        cache.prototype.isReady = () => {

            return false;
        };

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.statusCode).to.equal(200);
            expect(res2.result).to.equal('2');
            cache.prototype.isReady = isReadyRestore;
            done();
        });
    });
});

it('still loads from cache when errorOnCacheNotReady option set to false but cache is ready', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 0,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };
    const server = new Hapi.Server(hapiOptions);

    server.route([{
        method: 'GET', path: '/', handler: (request, h) => {

            request.yar.set('some', 'value');
            return null;
        }
    },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.statusCode).to.equal(200);
            expect(res2.result).to.equal('2');
            done();
        });
    });
});

it('still saves session as cookie when cache is not ready if maxCookieSize is set and big enough', {parallel: false}, async (done) => {

    const options = {
        maxCookieSize: 500,
        errorOnCacheNotReady: false,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const cache = require('./test-cache');

    const hapiOptions = {
        cache: {
            engine: cache
        },
        debug: false
    };

    const server = new Hapi.Server(hapiOptions);

    server.route([{
        method: 'GET', path: '/', handler: (request, h) => {

            request.yar.set('some', 'value');
            return null;
        }
    },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);
        const isReadyRestore = cache.prototype.isReady;

        cache.prototype.isReady = () => {

            return false;
        };

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.statusCode).to.equal(200);
            expect(res2.result).to.equal('value');
            cache.prototype.isReady = isReadyRestore;
            done();
        });
    });
});

it('fails generating session cookie header value (missing password)', async (done) => {

    const server = new Hapi.Server({debug: false});

    server.route({
        method: 'GET', path: '/1', handler: (request, h) => {

            request.yar.set('some', {value: '2'});
            return '1';
        }
    });

    await server.register({plugin: require('../')});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.statusCode).to.equal(500);
        done();
    });
});

it('sends back a 400 if not ignoring errors on bad session cookie', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false,
            ignoreErrors: false
        }
    };

    const headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    const server = new Hapi.Server({debug: false});

    server.route({
        method: 'GET', path: '/1', handler: (request, h) => {

            request.yar.set('some', {value: '2'});
            return '1';
        }
    });

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1', headers}, (res) => {

        expect(res.statusCode).to.equal(400);
        done();
    });
});

it('fails to store session because of state error', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const headers = {
        Cookie: 'session=Fe26.2**deadcafe' // bad session value
    };

    const server = new Hapi.Server({debug: false});

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                return Object.keys(request.yar._store).length;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1', headers}, (res) => {

        expect(res.result).to.equal(0);
        done();
    });
});

it('ignores requests when session is not set (error)', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    server.route({
        method: 'GET',
        path: '/',
        handler: async (request, h) => {

            return 'ok';
        }
    });

    server.ext({
        type: 'onRequest',
        method: (request, h) => {
            return Boom.badRequest('handler error');
        }
    });

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject('/', (res) => {

        expect(res.statusCode).to.equal(400);
        expect(res.result.message).to.equal('handler error');
        done();
    });
});

it('ignores requests when the skip route config value is true', async (done) => {

    const options = {
        cookieOptions: {
            password: internals.password
        }
    };
    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/',
            handler: (request, h) => {
                return '1';
            },
            config: {
                plugins: {
                    yar: {
                        skip: true
                    }
                }
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/'}, (res) => {

        const header = res.headers['set-cookie'];
        expect(header).to.be.undefined();
        done();
    });
});

describe('flash()', async () => {

    it('should get all flash messages when given no arguments', async (done) => {

        const options = {
            cookieOptions: {
                password: internals.password
            }
        };

        const server = new Hapi.Server();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: (request, h) => {

                    request.yar.flash('error', 'test error 1');
                    request.yar.flash('error', 'test error 2');
                    request.yar.flash('test', 'test 1', true);
                    request.yar.flash('test', 'test 2', true);
                    return request.yar._store;
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: (request, h) => {

                    const flashes = request.yar.flash();
                    return {
                        yar: request.yar._store,
                        flashes
                    };
                }
            }
        });

        await server.register({plugin: require('../'), options: options});
        await server.start();

        server.inject({method: 'GET', url: '/1'}, (res) => {

            expect(res.result._flash.error).to.equal(['test error 1', 'test error 2']);
            expect(res.result._flash.test).to.equal('test 2');

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
            const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

                expect(res2.result.yar._flash.error).to.not.exist();
                expect(res2.result.flashes).to.exist();
                done();
            });
        });
    });

    it('should delete on read', async (done) => {

        const options = {
            cookieOptions: {
                password: internals.password
            }
        };

        const server = new Hapi.Server();

        server.route({
            method: 'GET',
            path: '/1',
            config: {
                handler: (request, h) => {

                    request.yar.flash('error', 'test error');
                    return request.yar._store;
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/2',
            config: {
                handler: (request, h) => {

                    const errors = request.yar.flash('error');
                    const nomsg = request.yar.flash('nomsg');
                    return {
                        yar: request.yar._store,
                        errors,
                        nomsg
                    };
                }
            }
        });

        await server.register({plugin: require('../'), options: options});
        await server.start();

        server.inject({method: 'GET', url: '/1'}, (res) => {

            expect(res.result._flash.error).to.exist();
            expect(res.result._flash.error.length).to.be.above(0);

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
            const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

                expect(res2.result.yar._flash.error).to.not.exist();
                expect(res2.result.errors).to.exist();
                expect(res2.result.nomsg).to.exist();
                done();
            });
        });
    });
});

it('stores blank sessions when storeBlank is not given', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                return 'heyo!';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    let stores = 0;

    const cachesDefault = server._core.caches.get('_default');

    const fn = cachesDefault.client.set;
    cachesDefault.client.set = function () { // Don't use arrow function here.

        stores++;
        fn.apply(this, arguments);
    };

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(stores).to.equal(1);
        expect(res.headers['set-cookie'].length).to.equal(1);
        done();
    });
});

it('does not store blank sessions when storeBlank is false', async (done) => {

    const options = {
        storeBlank: false,
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                return 'heyo!';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                request.yar.set('hello', 'world');
                return 'should be set now';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    let stores = 0;

    const cachesDefault = server._core.caches.get('_default');

    const fn = cachesDefault.client.set;
    cachesDefault.client.set = function () { // Don't use arrow function here.

        stores++;
        fn.apply(this, arguments);
    };

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(stores).to.equal(0);
        expect(res.headers['set-cookie']).to.be.undefined();

        server.inject({method: 'GET', url: '/2'}, (res2) => {

            expect(stores).to.equal(1);
            expect(res2.headers['set-cookie'].length).to.equal(1);
            done();
        });
    });
});

it('allow custom session ID', async (done) => {

    let sessionIDExternalMemory = 0;

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: () => {

            sessionIDExternalMemory += 1;
            return `custom_id_${sessionIDExternalMemory}`;
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                expect(request.yar.id).to.equal('custom_id_1');
                return 'custom_id_1';
            }
        },
        {
            method: 'GET', path: '/2', handler: (request, h) => {

                request.yar.reset();
                request.yar.touch();
                expect(request.yar.id).to.equal('custom_id_2');
                return 'custom_id_2';
            }
        },
        {
            method: 'GET', path: '/still_2', handler: (request, h) => {

                expect(request.yar.id).to.equal('custom_id_2');
                return 'custom_id_2';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal('custom_id_1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        const cookie = header[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

        server.inject({method: 'GET', url: '/2', headers: {cookie: cookie[1]}}, (res2) => {

            expect(res2.result).to.equal('custom_id_2');
            const header2 = res2.headers['set-cookie'];
            expect(header2.length).to.equal(1);
            const cookie2 = header2[0].match(/(session=[^\x00-\x20\"\,\;\\\x7F]*)/);

            server.inject({method: 'GET', url: '/still_2', headers: {cookie: cookie2[1]}}, (res3) => {

                expect(res3.result).to.equal('custom_id_2');
                done();
            });
        });
    });
});

it('pass the resquest as parameter of customSessionIDGenerator', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: (request) => {

            return request.path;
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/request-based-session-id', handler: (request, h) => {

                expect(request.yar.id).to.equal('/request-based-session-id');
                return 'ok';
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/request-based-session-id'}, (res) => {

        expect(res.result).to.equal('ok');

        done();
    });
});

it('will set an session ID if no custom session ID generator function is provided', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        }
    };

    const server = new Hapi.Server();

    server.route([
        {
            method: 'GET', path: '/1', handler: (request, h) => {

                expect(request.yar.id).to.exist();
                return 1;
            }
        }
    ]);

    await server.register({plugin: require('../'), options: options});
    await server.start();

    server.inject({method: 'GET', url: '/1'}, (res) => {

        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        done();

    });
});

it('will throw error if session ID generator function don\'t return a string', async (done) => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: (request) => {

            switch (request.path) {
                case '/null':
                    return null;
                case '/number':
                    return 1;
                case '/object':
                    return {};
                case '/function':
                    return (() => {
                    });
                case '/boolean':
                    return true;
                case '/array':
                    return [];
                case '/undefined':
                    return undefined;
                default:
                    return 'abc';
            }
        }
    };

    const server = new Hapi.Server();

    const types = ['null', 'number', 'object', 'function', 'boolean', 'array', 'undefined'];

    server.route(types.map((type) => ({method: 'GET', path: `/${type}`, handler: (request, h) => type})));

    await server.register({ plugin: require('../'), options: options });
    await server.start();

    types.forEach((item) => {
        try {
            server.inject({method: 'GET', url: '/' + item}, (res) => {
            });
        } catch (err) {
            expect(err.message).to.be('Session ID should be a string');
        }
    });

    return true;
});

it('will throw error if session ID generator function is defined but not typeof function', async () => {

    const options = {
        maxCookieSize: 0,
        cookieOptions: {
            password: internals.password,
            isSecure: false
        },
        customSessionIDGenerator: 'notAfunction'
    };

    const server = new Hapi.Server();

    try {
        await server.register({plugin: require('../'), options: options});
    } catch (err) {
        expect(err.message).to.equal('customSessionIDGenerator should be a function');
    }

    return true;
});
