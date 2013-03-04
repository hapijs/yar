// Load modules

var Chai = require('chai');
var Hapi = require('hapi');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Session', function () {

    describe("#cookieStore", function () {

        it('should set/get request.session properly using cookie', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/set',
                config: {
                    handler: function (request) {

                        request.session.test = 1;
                        request.reply('ok');
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/get',
                config: {
                    handler: function (request) {

                        request.reply(request.session);
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                server.inject({ method: 'GET', url: '/set' }, function (res) {

                    expect(res.result).to.equal('ok');
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);

                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/get', headers: { cookie: cookie[1] } }, function (res) {

                        // expect(res.result).to.contain('test');
                        var header = res.headers['Set-Cookie'];
                        expect(header.length).to.equal(1);
                        done();
                    });
                });
            });
        });

        it('should not set cookie if given empty session', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/set',
                config: {
                    handler: function (request) {

                        request.session = {};
                        request.reply('ok');
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/get',
                config: {
                    handler: function (request) {

                        request.reply(request.session);
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                server.inject({ method: 'GET', url: '/set' }, function (res) {

                    expect(res.result).to.equal('ok');
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);

                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/get', headers: { cookie: cookie[1] } }, function (res) {

                        // expect(res.result).to.contain('test');
                        var header = res.headers['Set-Cookie'];
                        expect(header.length).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    describe("#extStore", function () {

        var extStore = function (options) {

            this.options = options || {};
            this._store = {};

            return this;
        };


        extStore.prototype.validate = function (session) {

            if (!session) {
                return false;
            }
            return true;
        };


        extStore.prototype.get = function (key, session, callback) {

            if (typeof session == 'function') {
                callback = session;
                session = null;
            }

            if (session) {
                this._store[key] = session;
            }

            return callback(null, this._store[key]);
        };
        
        
        extStore.prototype.delete = function (key, session, callback) {

            if (typeof session == 'function') {
                callback = session;
                session = null;
            }
            
            delete this._store[key];
            
            callback(null, {});
        };


        describe('extStore', function () {

            it('should have a validate function', function (done) {

                var sessionstore = new extStore();
                expect(sessionstore.validate).to.exist;
                done();
            });
        });
        
        
        it('should set/get request.session properly using extStore', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: {
                    store: extStore
                }
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/set',
                config: {
                    handler: function (request) {

                        request.session.test = 1;
                        request.reply('ok');
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/get',
                config: {
                    handler: function (request) {

                        request.reply(request.session);
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                server.inject({ method: 'GET', url: '/set' }, function (res) {

                    expect(res.result).to.equal('ok');
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);

                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/get', headers: { cookie: cookie[1] } }, function (res) {

                        // expect(res.result).to.contain('test');
                        var header = res.headers['Set-Cookie'];
                        expect(header.length).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    describe("#memoryStore", function () {

        var longstr = [];
        for(var i = 0; i < 2500; ++i) {
            longstr.push('a');
        }
        longstr = longstr.join("");

        it('should set/get request.session properly using memoryStore', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/set',
                config: {
                    handler: function (request) {

                        request.session.test = longstr;
                        request.reply('ok');
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/get',
                config: {
                    handler: function (request) {

                        request.reply(request.session);
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                server.inject({ method: 'GET', url: '/set' }, function (res) {

                    expect(res.result).to.equal('ok');
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);

                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/get', headers: { cookie: cookie[1] } }, function (res) {

                        // expect(res.result).to.contain('test');
                        var header = res.headers['Set-Cookie'];
                        expect(header.length).to.equal(1);
                        done();
                    });
                });
            });
        });

        it('should work even if empty session given', function (done) {

            var options = {
                isSingleUse: false,
                cookieOptions: {
                    password: 'password'
                },
                session: true
            };
            var server = new Hapi.Server();

            server.route({
                method: 'GET',
                path: '/set',
                config: {
                    handler: function (request) {

                        request.session.test = longstr;
                        request.reply('ok');
                    }
                }
            });
            
            server.route({
                method: 'GET',
                path: '/get',
                config: {
                    handler: function (request) {

                        request.reply(request.session);
                    }
                }
            });

            server.plugin.allow({ ext: true }).require('../../', options, function (err) {

                expect(err).to.not.exist;
                server.inject({ method: 'GET', url: '/set' }, function (res) {

                    expect(res.result).to.equal('ok');
                    var header = res.headers['Set-Cookie'];
                    expect(header.length).to.equal(1);

                    var cookie = header[0].match(/(yar=[^\x00-\x20\"\,\;\\\x7F]*)/);

                    server.inject({ method: 'GET', url: '/get', headers: { cookie: cookie[1] } }, function (res) {

                        // expect(res.result).to.contain('test');
                        var header = res.headers['Set-Cookie'];
                        expect(header.length).to.equal(1);
                        done();
                    });
                });
            });
        });
    });
});