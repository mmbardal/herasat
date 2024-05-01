import {IncomingMessage} from "node:http";
import Ajv, {ValidateFunction} from "ajv";
import {Readable} from "node:stream";

export class Completer<T> {
    public readonly promise: Promise<T>;
    public complete: (value: (PromiseLike<T> | T)) => void;
    private reject: (reason?: any) => void;

    constructor() {
        this.complete = () => {};
        this.reject = () => {};

        this.promise = new Promise<T>((resolve, reject) => {
            this.complete = resolve;
            this.reject = reject;
        })
    }
}

export async function readBody(req: IncomingMessage):Promise<string> {
    const comp = new Completer<boolean>();
    let ret = "";

    req.on('readable', function() {
        ret += req.read();
    });

    req.on('end', function() {
        comp.complete(true);
    });

    await comp.promise;

    return ret;
}



export function validate<T>(jbody:T,validator:ValidateFunction,):T {
    if(!validator(jbody)){
        throw new Error(`${validator.errors}`);
    }
    return jbody;
}


// export async function streamToBuffer(stream: Readable): Promise<Buffer> {
//     const chunks = [];

//     for await (const chunk of stream) {
//         chunks.push(chunk);
//     }

//     return Buffer.concat(chunks);
// }

export const ajv = new Ajv({ allErrors: true, multipleOfPrecision: 12 });

interface BufferSchemaType {
    minLength?: number;
    maxLength?: number;
}

ajv.addKeyword({
    keyword: 'buffer',
    compile(schema: BufferSchemaType) {
        if (typeof schema !== 'object') {
            throw new Error(`value of buffer must be object: '${typeof schema}'`);
        }

        if (schema.minLength === undefined && schema.maxLength === undefined) {
            throw new Error('at least minLength or maxLength must be provided');
        }

        return function (data) {
            if (!(data instanceof Buffer)) {
                return false;
            }

            if (schema.minLength !== undefined && data.length < schema.minLength) {
                return false;
            }

            return !(schema.maxLength !== undefined && data.length > schema.maxLength);
        };
    },
});