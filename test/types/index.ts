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

        success: { title: string; message: string; type: 'success' };
        error: { title: string; message: string; type: 'error' };
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

            /** Typed YarValues */
            const example = request.yar.get('example');

            expect.error(
                request.yar.get('test1') === 123
            );

            const test1 = request.yar.get('test1');
            const test2 = request.yar.get('test2');

            test1 === '1233';
            test2?.a === true;

            expect.type<string | null>(test1);
            expect.type<{ a: true; b: string } | null>(test2);


            /** Untyped YarValues */
            const test3 = request.yar.get <{ something: 'else' }>('test3');

            expect.type<{ something: 'else' } | null>(test3);

            expect.error(
                request.yar.get <boolean>('test4') === 123
            );


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

            /** Typed YarValues */
            expect.type<string>(
                request.yar.set('test1', '123')
            );

            expect.error<string>(
                request.yar.set('test1', 123)
            );

            expect.type<yar.YarValues['test2']>(
                request.yar.set('test2', {
                    a: true,
                    b: '123',
                })
            );

            const partialYarObj = {
                test1: '123',
            };

            expect.type<Partial<yar.YarValues>>(request.yar.set(partialYarObj));

            expect.error<Partial<yar.YarValues>>(
                request.yar.set({ bad: 'type' })
            );


            /** Untyped YarValues */

            expect.type<{ good: 'type' }>(
                request.yar.set({ good: 'type' })
            );

            expect.type<boolean>(
                request.yar.set('anything', true)
            );


            /** Typed YarFlashes */
            expect.type<yar.YarFlashes['error'][]>(

                request.yar.flash('error', {
                    title: 'Error',
                    message: 'This is an error',
                    type: 'error'
                })
            );

            expect.type<yar.YarFlashes['success'][]>(
                request.yar.flash('success', {
                    title: 'Success',
                    message: 'This is a success',
                    type: 'success'
                })
            );

            expect.error<yar.YarFlashes[yar.YarFlashKeys][]>(
                request.yar.flash('info', 'message')
            )

            expect.type<yar.YarFlashes['error'][]>(
                request.yar.flash('error')
            )

            expect.type<yar.YarFlashes['success'][]>(
                request.yar.flash('success')
            )

            expect.error<yar.YarFlashes['success'][]>(
                request.yar.flash('error')
            )

            expect.type<{ [k in keyof yar.YarFlashes]: yar.YarFlashes[k][] }>(
                request.yar.flash()
            );

            /** Untyped YarFlashes */

            expect.type<string[]>(
                request.yar.flash('info', 'message')
            )


            type OtherFlash = {
                name: string;
                text: string;
            }

            type CustomFlashes = {

                info: OtherFlash
                warning: OtherFlash
            };

            expect.type<{ [key in keyof CustomFlashes]: OtherFlash[] }>(
                request.yar.flash <CustomFlashes>()
            );

            return {
                id: request.yar.id,
            };
        },
    });
}