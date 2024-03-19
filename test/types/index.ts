import * as lab from '@hapi/lab';
import { Request, Server } from '@hapi/hapi';
import * as yar from '../..';

const { expect } = lab.types;

declare module '../..' {

    interface YarValues {

        test1: string;
        test2: {
            a: true;
            b: string;
        },

        example: {
            key: string;
        };
    }

    interface YarFlashes {

        success: { title: string; message: string; };
        error: { title: string; message: string; };
    }
}

async function boot() {
    const server = new Server();
    await server.register({
        plugin: yar,
        options: {
            cookieOptions: {
                password: 'test',
                isSecure: true,
            },
            cache: {
                cache: 'test',
                expiresIn: 123141243,
            },
        },
    });

    server.route({
        path: '/test',
        method: 'get',
        handler(request: Request) {

            const example = request.yar.get('example');

            expect.error(request.yar.get('testX'));

            expect.error(
                request.yar.get('test1') === 123
            );


            const test1 = request.yar.get('test1');
            const test2 = request.yar.get('test2');

            test1 === '1233';
            test2?.a === true;

            return {
                id: request.yar.id,
                key: example?.key,
            };
        },
    });

    server.route({

        path: '/test',
        method: 'post',
        handler(request: Request) {


            request.yar.set('test1', '123');
            request.yar.set('test2', {
                a: true,
                b: '123',
            });

            request.yar.set({
                test1: '123',
            });

            request.yar.flash('error', {
                title: 'Error',
                message: 'This is an error'
            });

            request.yar.flash('success', {
                title: 'Success',
                message: 'This is a success'
            });


            return {
                id: request.yar.id,
            };
        },
    });

    server.route({

        path: '/test',
        method: 'post',
        handler(request: Request) {


            expect.error(request.yar.set('abc123', true));

            request.yar.set('test1', '123');
            request.yar.set('test2', {
                a: true,
                b: '123',
            });

            expect.error(request.yar.set('test1', 123))
            expect.error(request.yar.set('test2', 123))

            request.yar.set({
                test1: '123',
            });

            request.yar.flash('error', { title: 'Error', message: 'This is an error' });
            request.yar.flash('success', { title: 'Success', message: 'This is a success' });

            expect.error(
                request.yar.flash('test', { title: 'Success', message: 'This is a success' })
            )

            expect.error(request.yar.flash('success', 'message'));


            return {
                id: request.yar.id,
            };
        },
    });
}