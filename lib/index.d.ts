import { Id, PolicyOptions } from '@hapi/catbox';
import { CachePolicyOptions, Plugin, Request, ResponseToolkit, Server, ServerOptionsCache } from '@hapi/hapi';


declare namespace yar {

    export interface YarValues {}
    export interface YarFlashes {}

    type YarValKeys = keyof YarValues;
    type YarFlashKeys = keyof YarFlashes;

    interface YarOptions {
        /**
         * Determines the name of the cookie used to store session information.
         * Defaults to session.
         */
        name?: string | undefined;

        /**
         * maximum cookie size before using server-side storage.
         * Defaults to 1K. Set to zero to always use server-side storage.
         */
        maxCookieSize?: number | undefined;

        /**
         * determines whether to store empty session before they've been modified.
         * Defaults to true.
         */
        storeBlank?: boolean | undefined;

        /**
         * will cause yar to throw an exception if trying to persist to cache when the cache is unavailable.
         * Setting this to false will allow applications using yar to run uninterrupted if the cache is not ready (however sessions will not be saving).
         * Defaults to true.
         */
        errorOnCacheNotReady?: boolean | undefined;

        /**
         * hapi cache options which includes (among other options):
         */
        cache?: CachePolicyOptions<any> | undefined;

        /**
         * the configuration for cookie-specific features:
         */
        cookieOptions: {
            /**
             * Tells Hapi that it should not respond with a HTTP 400 error if the session cookie cannot decrypt.
             * This could happen if the cookie is changed on the client, or more likely, if you change the cookie password in your settings.
             * If you want to make this condition send an error like it did in prior versions, change this to `false`,
             * but be aware that if you change your cookie password you will cause 400 errors to be returned to end users.
             * In that case you should probably change this back to true for a short time to allow session cookies to get reset for the best user experience.
             * Defaults to true.
             */
            ignoreErrors?: boolean | undefined;

            /**
             * Tells Hapi that if a session cookie is invalid for any reason,
             * to clear it from the browser.
             * This prevents Hapi from having to reprocess the bad cookie on future requests.
             * In general you'll probably want this on,
             * but if you'd prefer that session cookies be dealt with in some
             * other way you may set this to false.
             * Defaults to true
             */
            clearInvalid?: boolean | undefined;
            /**
             * (Required) used to encrypt and sign the cookie data.
             * Must be at least 32 chars.
             */
            password: string;
            /**
             * determines the cookie path.
             * Defaults to '/'.
             */
            path?: string | undefined;
            /**
             * enables the same-site cookie parameter.
             * Default to 'Lax'.
             */
            isSameSite?: 'Lax' | 'Strict' | 'None' | false | undefined;
            /**
             * determines whether or not to transfer using TLS/SSL.
             * Defaults to true.
             */
            isSecure?: boolean | undefined;
            /**
             * determines whether or not to set HttpOnly option in cookie.
             * Defaults to false.
             */
            isHttpOnly?: boolean | undefined;
            /**
             * sets the time for the cookie to live in the browser, in milliseconds.
             * Defaults to null (session time-life - cookies are deleted when the browser is closed).
             */
            ttl?: number | undefined;
            /**
             * an optional function to create custom session IDs.
             * Must retun a string and have the signature function (request) where:
             * request - (optional) is the original request received from the client.
             * Defaults to uuidv4
             */
            customSessionIDGenerator?(req: Request): string;
        };
    }

    interface Yar {
        /**
         * Session id, see `customSessionIDGenerator`.
         */
        readonly id: string;
        /**
         * clears the session and assigns a new session id.
         */
        reset(): void;
        /**
         * - assigns a value (string, object, etc) to a given key which will persist across requests. Returns the value.
         */
        set<T extends YarValKeys>(key: T, value: YarValues[T]): YarValues[T];
        set<T = unknown>(key: string, value: T): T;


        /**
         *  assigns values to multiple keys using each 'keysObject' top-level property. Returns the keysObject.
         */
        set<T extends Partial<YarValues>>(keysObject: T): T;
        set<T = Record<string, unknown>>(keysObject: T): T;

        /**
         * retrieve value using a key. If 'clear' is 'true', key is cleared on return.
         */
        get <T extends YarValKeys>(key: T, clear?: boolean): YarValues[T] | null;
        get <T = unknown>(key: string, clear?: boolean): T | null;
        /**
         * clears key.
         */
        clear <T extends YarValKeys>(key: T): void;
        clear (key: string): void;
        /**
         * Manually notify the session of changes (when using get()
         * and changing the content of the returned reference directly without calling set()).
         */
        touch(): void;
        /**
         * stores volatile data - data that should be deleted once read.
         * When given no arguments, it will return all of the flash messages and delete the originals.
         * When given only a type, it will return all of the flash messages of that type and delete the originals.
         * When given a type and a message, it will set or append that message to the given type.
         * 'isOverride' used to indicate that the message provided should replace
         * any existing value instead of being appended to it (defaults to false).
         */
        flash <T extends YarFlashKeys>(type: T, message: YarFlashes[T], isOverride?: boolean): YarFlashes[T][];
        flash <T = unknown>(type: string, message: T, isOverride?: boolean): T[];
        flash <T extends YarFlashKeys>(type: T): YarFlashes[T][];
        flash <T = YarFlashes>(): { [key in keyof T]: T[key][] };

        /**
         * if set to 'true', enables lazy mode.
         * In lazy mode, request.yar can be modified directly (e.g. setting request.yar.myKey to an object value),
         * and those keys will be stored and loaded back.
         * Lazy mode isn't as fast as the normal get/set because
         * it has to store the session state on every responses regardless of any changes being made.
         */
        lazy(enabled: boolean): void;

        /**
         * used to manually prepare the session state and commit it into the response when the response is taken
         * over in an onPreResponse handler. Normally, the yar onPreRespinse handler performs the commit, but if
         * an application extension handler takes over, yar doesn't get a chance to commit the state before the
         * response goes out. The method requires the hapi h toolkit argument available in the extension handler.
         */
        commit(h: ResponseToolkit): Promise<void>;
    }

    interface ServerYar {
        revoke(id: Id): Promise<void>;
    }
}

declare const yar: Plugin<yar.YarOptions>;

export = yar;

declare module '@hapi/hapi' {
    interface Request {
        yar: yar.Yar;
    }

    interface Server {
        yar: yar.ServerYar;
    }
}
