'use strict';

const Boom = require('@hapi/boom');
const Code = require('@hapi/code');
const Hapi = require('@hapi/hapi');
const Hoek = require('@hapi/hoek');
const Lab = require('@hapi/lab');
const Yar = require('..');

const Cache = require('./test-cache.js');


const internals = {
    password: 'passwordmustbelongerthan32characterssowejustmakethislonger',
    sessionRegex: /(session=[^\x00-\x20\"\,\;\\\x7F]*)/,
    config: {
        cache: {
            [require('@hapi/hapi/package.json').version[1] === '7' ? 'engine' : 'provider']: Cache
        },
        debug: false
    }
};


const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const expect = Code.expect;


describe('yar', () => {

    it('sets session value then gets it back (store mode)', async () => {

        const server = new Hapi.Server();

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    let returnValue = request.yar.set('some', { value: '2' });

                    expect(returnValue.value).to.equal('2');
                    returnValue = request.yar.set('one', 'xyz');
                    expect(returnValue).to.equal('xyz');

                    request.yar.clear('one');

                    return Object.keys(request.yar._store).length;
                },
                config: {
                    plugins: {
                        yar: {}
                    }
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    const some = request.yar.get('some');
                    some.raw = 'access';

                    request.yar.touch();

                    return some.value;
                }
            },
            {
                method: 'GET', path: '/3', handler: (request, h) => {

                    const raw = request.yar.get('some').raw;

                    request.yar.reset();

                    return raw;
                }
            }
        ]);

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.not.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });

        expect(res2.result).to.equal('2');
        const header2 = res2.headers['set-cookie'];
        const cookie2 = header2[0].match(internals.sessionRegex);

        const res3 = await server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } });

        expect(res3.result).to.equal('access');
    });

    it('sets session value and wait till cache expires then fail to get it back', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('some', { value: '2' });
                    request.yar.set('one', 'xyz');
                    request.yar.clear('one');
                    return Object.keys(request.yar._store).length;
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar.get('some');
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                },
                cache: {
                    expiresIn: 1
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.not.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        await Hoek.wait(10);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal(null);
    });

    it('sets session value then gets it back (cookie mode)', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('some', { value: '2' });
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar.get('some').value;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                cookieOptions: {
                    password: internals.password
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal('2');
    });

    it('sets session value then gets it back (hybrid mode)', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('some', { value: '12345678901234567890' });
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar.get('some').value;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 10,
                cookieOptions: {
                    password: internals.password
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal('12345678901234567890');
    });

    it('sets session value then gets it back (lazy mode)', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.lazy(true);
                    request.yar.some = { value: '2' };
                    request.yar.ignore = () => { };
                    request.yar._test = { value: '3' };
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

                    return request.yar._test || null;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                cookieOptions: {
                    password: internals.password
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal('2');
        const header2 = res2.headers['set-cookie'];
        const cookie2 = header2[0].match(internals.sessionRegex);

        const res3 = await server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } });
        expect(res3.result).to.be.null();
    });

    it('ignores initial invalid cookie', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('some', { value: '2' });
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar.get('some');
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                cookieOptions: {
                    password: internals.password
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] + ';' + cookie[1] } });
        expect(res2.result).to.equal(null);
    });

    it('no keys when in session (lazy mode)', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.lazy(true);
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar._store;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                cookieOptions: {
                    password: internals.password
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        expect(header[0]).to.contain('Secure');
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.be.empty();
    });

    it('sets session value then gets it back (clear)', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

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
                method: 'GET', path: '/2', handler: (request, h) => {

                    const some = request.yar.get('some', true);
                    return some;
                }
            },
            {
                method: 'GET', path: '/3', handler: (request, h) => {

                    const some = request.yar.get('some');
                    return some || '3';
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.result).to.equal('1');
        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal('2');
        const header2 = res2.headers['set-cookie'];
        const cookie2 = header2[0].match(internals.sessionRegex);

        const res3 = await server.inject({ method: 'GET', url: '/3', headers: { cookie: cookie2[1] } });
        expect(res3.result).to.equal('3');
    });

    it('returns 500 when storing cookie in invalid cache by default', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('some', { value: '2' });
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    return request.yar.get('some');
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        const cachesDefault = server._core.caches.get('_default');
        cachesDefault.client.stop();

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        expect(res2.statusCode).to.equal(500);
    });

    it('fails setting session key/value because of bad key/value arguments', async () => {

        const server = new Hapi.Server({ debug: false });

        server.route([
            {
                method: 'GET', path: '/1', handler: (request) => {

                    request.yar.set({ 'some': '2' }, '2');
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

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.statusCode).to.equal(500);

        const res2 = await server.inject({ method: 'GET', url: '/2' });
        expect(res2.statusCode).to.equal(500);
    });

    it('fails setting session key/value because of failed cache set', { parallel: false }, async () => {

        const setRestore = Cache.prototype.set;

        Cache.prototype.set = (key, value, ttl) => {

            throw new Error('Error setting cache');
        };

        const server = new Hapi.Server(internals.config);

        server.route({
            method: 'GET', path: '/', handler: (request, h) => {

                request.yar.set('some', 'value');

                return null;
            }
        });

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });
        Cache.prototype.set = setRestore;
        expect(res.statusCode).to.equal(500);
    });

    it('does not try to store session when cache not ready if errorOnCacheNotReady set to false', { parallel: false }, async () => {

        const getRestore = Cache.prototype.get;
        const isReadyRestore = Cache.prototype.isReady;

        Cache.prototype.get = () => {

            return new Error('Error getting cache');
        };

        Cache.prototype.isReady = () => {

            return false;
        };

        const server = new Hapi.Server(internals.config);

        const preHandler = (request, h) => {

            request.yar.set('some', 'value');
            return null;
        };

        const handler = (request, h) => {

            return request.yar.get('some');
        };

        server.route({
            method: 'GET',
            path: '/',
            config: {
                pre: [
                    { method: preHandler }
                ],
                handler
            }
        });

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                errorOnCacheNotReady: false,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });
        Cache.prototype.get = getRestore;
        Cache.prototype.isReady = isReadyRestore;

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('value');
    });

    it('fails loading session from invalid cache and returns 500', { parallel: false }, async () => {

        const server = new Hapi.Server(internals.config);

        server.route([
            {
                method: 'GET', path: '/', handler: (request, h) => {

                    request.yar.set('some', 'value');
                    return '1';
                }
            },
            {
                method: 'GET', path: '/2', handler: (request, h) => {

                    //handlerSpy();
                    request.yar.set(45.68, '2');
                    return '1';
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        expect(res.statusCode).to.equal(200);
        expect(res.result).to.equal('1');

        const getRestore = Cache.prototype.get;
        const isReadyRestore = Cache.prototype.isReady;

        Cache.prototype.get = () => {

            throw new Error('Error getting cache');
        };

        Cache.prototype.isReady = () => {

            return false;
        };

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        Cache.prototype.get = getRestore;
        Cache.prototype.isReady = isReadyRestore;

        expect(res2.statusCode).to.equal(500);
    });

    it('does not load from cache if cache is not ready and errorOnCacheNotReady set to false', { parallel: false }, async () => {

        const server = new Hapi.Server(internals.config);


        server.route([{
            method: 'GET', path: '/', handler: (request, h) => {

                request.yar.set('some', 'value');
                return null;
            }
        }, {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                errorOnCacheNotReady: false,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);
        const isReadyRestore = Cache.prototype.isReady;

        Cache.prototype.isReady = () => {

            return false;
        };

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
        Cache.prototype.isReady = isReadyRestore;

        expect(res2.statusCode).to.equal(200);
        expect(res2.result).to.equal('2');
    });

    it('loads from cache when errorOnCacheNotReady option set to false but cache is ready', { parallel: false }, async () => {

        const server = new Hapi.Server(internals.config);

        server.route([{
            method: 'GET', path: '/', handler: (request, h) => {

                request.yar.set('some', 'value');
                return null;
            }
        }, {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                errorOnCacheNotReady: false,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });

        expect(res2.statusCode).to.equal(200);
        expect(res2.result).to.equal('2');
    });

    it('saves session as cookie when cache is not ready if maxCookieSize is set and big enough', { parallel: false }, async () => {

        const server = new Hapi.Server(internals.config);

        server.route([{
            method: 'GET', path: '/', handler: (request, h) => {

                request.yar.set('some', 'value');
                return null;
            }
        }, {
            method: 'GET', path: '/2', handler: (request, h) => {

                const value = request.yar.get('some');
                return value || '2';
            }
        }]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 500,
                errorOnCacheNotReady: false,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });

        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);
        const isReadyRestore = Cache.prototype.isReady;

        Cache.prototype.isReady = () => {

            return false;
        };

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });

        expect(res2.statusCode).to.equal(200);
        expect(res2.result).to.equal('value');
        Cache.prototype.isReady = isReadyRestore;
    });

    it('fails generating session cookie header value (missing password)', async () => {

        const server = new Hapi.Server({ debug: false });

        server.route({
            method: 'GET', path: '/1', handler: (request, h) => {

                request.yar.set('some', { value: '2' });
                return '1';
            }
        });

        await server.register({ plugin: Yar });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.statusCode).to.equal(500);
    });

    it('sends back a 400 if not ignoring errors on bad session cookie', async () => {

        const headers = {
            Cookie: 'session=Fe26.2**deadcafe' // bad session value
        };

        const server = new Hapi.Server({ debug: false });

        server.route({
            method: 'GET', path: '/1', handler: (request, h) => {

                request.yar.set('some', { value: '2' });
                return '1';
            }
        });

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false,
                    ignoreErrors: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1', headers });
        expect(res.statusCode).to.equal(400);
    });

    it('fails to store session because of state error', async () => {

        const headers = {
            Cookie: 'session=Fe26.2**deadcafe' // bad session value
        };

        const server = new Hapi.Server({ debug: false });

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    return Object.keys(request.yar._store).length;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1', headers });
        expect(res.result).to.equal(0);
    });

    it('ignores requests when session is not set (error)', async () => {

        const server = new Hapi.Server();

        server.route({
            method: 'GET',
            path: '/',
            handler: (request, h) => {

                return 'ok';
            }
        });

        server.ext({
            type: 'onRequest',
            method: (request, h) => {

                return Boom.badRequest('handler error');
            }
        });

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject('/');
        expect(res.statusCode).to.equal(400);
        expect(res.result.message).to.equal('handler error');
    });

    it('ignores requests when the skip route config value is true', async () => {

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

        await server.register({
            plugin: Yar, options: {
                cookieOptions: {
                    password: internals.password
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });
        const header = res.headers['set-cookie'];
        expect(header).to.be.undefined();
    });

    it('stores blank sessions when storeBlank is not given', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    return 'heyo!';
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        let stores = 0;

        const cachesDefault = server._core.caches.get('_default');

        const fn = cachesDefault.client.set;
        cachesDefault.client.set = function (...args) { // Don't use arrow function here.

            stores++;
            fn.apply(this, args);
        };

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(stores).to.equal(1);
        expect(res.headers['set-cookie'].length).to.equal(1);
    });

    it('does not store blank sessions when storeBlank is false', async () => {

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

        await server.register({
            plugin: Yar, options: {
                storeBlank: false,
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });
        await server.start();

        let stores = 0;

        const cachesDefault = server._core.caches.get('_default');

        const fn = cachesDefault.client.set;
        cachesDefault.client.set = function (...args) { // Don't use arrow function here.

            stores++;
            fn.apply(this, args);
        };

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(stores).to.equal(0);
        expect(res.headers['set-cookie']).to.be.undefined();

        const res2 = await server.inject({ method: 'GET', url: '/2' });
        expect(stores).to.equal(1);
        expect(res2.headers['set-cookie'].length).to.equal(1);
    });

    it('allow custom session ID', async () => {

        let sessionIDExternalMemory = 0;

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

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                },
                customSessionIDGenerator: () => {

                    sessionIDExternalMemory += 1;
                    return `custom_id_${sessionIDExternalMemory}`;
                }
            }
        });
        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal('custom_id_1');
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });

        expect(res2.result).to.equal('custom_id_2');
        const header2 = res2.headers['set-cookie'];
        expect(header2.length).to.equal(1);
        const cookie2 = header2[0].match(internals.sessionRegex);

        const res3 = await server.inject({ method: 'GET', url: '/still_2', headers: { cookie: cookie2[1] } });
        expect(res3.result).to.equal('custom_id_2');
    });

    it('pass the resquest as parameter of customSessionIDGenerator', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/request-based-session-id', handler: (request, h) => {

                    expect(request.yar.id).to.equal('/request-based-session-id');
                    return 'ok';
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                },
                customSessionIDGenerator: (request) => {

                    return request.path;
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/request-based-session-id' });
        expect(res.result).to.equal('ok');
    });

    it('sets an session ID if no custom session ID generator function is provided', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    expect(request.yar.id).to.exist();
                    expect(request.yar.id).to.not.equal('');
                    return 1;
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });
        expect(res.result).to.equal(1);
        const header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
    });

    it('throws error if session ID generator function doesn\'t return a string', async () => {

        const server = new Hapi.Server({ debug: false });

        const types = ['null', 'number', 'object', 'function', 'boolean', 'array', 'undefined'];

        server.route(types.map((type) => ({ method: 'GET', path: `/${type}`, handler: (request, h) => type })));

        await server.register({
            plugin: Yar, options: {
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
            }
        });
        await server.start();

        for (const type of types) {
            try {
                await server.inject({ method: 'GET', url: '/' + type });
            }
            catch (err) {
                expect(err.message).to.be('Session ID should be a string');
            }
        }
    });

    it('throws error if session ID generator function is defined but not typeof function', async () => {

        const server = new Hapi.Server();

        try {
            await server.register({
                plugin: Yar, options: {
                    maxCookieSize: 0,
                    cookieOptions: {
                        password: internals.password,
                        isSecure: false
                    },
                    customSessionIDGenerator: 'notAfunction'
                }
            });
        }
        catch (err) {
            expect(err.message).to.equal('customSessionIDGenerator should be a function');
        }
    });

    it('keeps falsy values', async () => {

        const server = new Hapi.Server();

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        server.route([
            {
                method: 'GET', path: '/1', handler: (request, h) => {

                    request.yar.set('boolean', false);
                    request.yar.set('number', 0);
                    request.yar.set('string', '');
                    request.yar.set('array', []);
                    return {
                        boolean: request.yar.get('boolean'),
                        number: request.yar.get('number'),
                        string: request.yar.get('string'),
                        array: request.yar.get('array')
                    };
                }
            }
        ]);

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/1' });

        expect(res.result).to.equal({
            boolean: false,
            number: 0,
            string: '',
            array: []
        });
    });

    it('allows to revoke session on the server side', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET', path: '/increment', handler: (request) => {

                    const value = request.yar.get('value');
                    const result = value ? value + 1 : 1;
                    request.yar.set('value', result);

                    return {
                        sessionId: request.yar.id,
                        value: result
                    };
                }
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password
                }
            }
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/increment' });
        expect(res.result.value).to.equal(1);
        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        await server.yar.revoke(res.result.sessionId);

        const res2 = await server.inject({ method: 'GET', url: '/increment', headers: { cookie: cookie[1] } });
        const res3 = await server.inject({ method: 'GET', url: '/increment', headers: { cookie: cookie[1] } });
        expect(res2.result.value).to.equal(1);
        expect(res3.result.value).to.equal(2);
    });

    it('retains state in onPreResponse redirect', async () => {

        const server = new Hapi.Server();

        server.route([
            {
                method: 'GET',
                path: '/',
                handler: (request, h) => {

                    request.yar.set({ x: 'a' });
                    return 'ok';
                }
            },
            {
                method: 'GET',
                path: '/read',
                handler: (request, h) => request.yar.get('x') + request.yar.get('y')
            }
        ]);

        await server.register({
            plugin: Yar, options: {
                maxCookieSize: 0,
                cookieOptions: {
                    password: internals.password,
                    isSecure: false
                }
            }
        });

        server.ext('onPreResponse', (request, h) => {

            if (request.path === '/read') {
                return h.continue;
            }

            request.yar.set('y', 'b');
            request.yar.commit(h);
            return h.response('redirected...').takeover().redirect('/');
        });

        await server.start();

        const res = await server.inject({ method: 'GET', url: '/' });

        expect(res.result).to.equal('redirected...');
        const header = res.headers['set-cookie'];
        const cookie = header[0].match(internals.sessionRegex);

        const res2 = await server.inject({ method: 'GET', url: '/read', headers: { cookie: cookie[1] } });
        expect(res2.result).to.equal('ab');
    });

    describe('flash()', () => {

        it('should get all flash messages when given no arguments', async () => {

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

            await server.register({
                plugin: Yar, options: {
                    cookieOptions: {
                        password: internals.password
                    }
                }
            });
            await server.start();

            const res = await server.inject({ method: 'GET', url: '/1' });

            expect(res.result._flash.error).to.equal(['test error 1', 'test error 2']);
            expect(res.result._flash.test).to.equal('test 2');

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
            const cookie = header[0].match(internals.sessionRegex);

            const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
            expect(res2.result.yar._flash.error).to.not.exist();
            expect(res2.result.flashes).to.exist();
        });

        it('should delete on read', async () => {

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

            await server.register({
                plugin: Yar, options: {
                    cookieOptions: {
                        password: internals.password
                    }
                }
            });
            await server.start();

            const res = await server.inject({ method: 'GET', url: '/1' });

            expect(res.result._flash.error).to.exist();
            expect(res.result._flash.error.length).to.equal(1);

            const header = res.headers['set-cookie'];
            expect(header.length).to.equal(1);
            const cookie = header[0].match(internals.sessionRegex);

            const res2 = await server.inject({ method: 'GET', url: '/2', headers: { cookie: cookie[1] } });
            expect(res2.result.yar._flash.error).to.not.exist();
            expect(res2.result.errors).to.exist();
            expect(res2.result.nomsg).to.exist();
        });
    });
});
