import { createClient } from 'redis';
import {redisHost, redisPort} from "./constatnts";


class RedisDB{
    static async sendObject(object:object):Promise<any>{
        const URL = `redis://${redisHost}:${redisPort}`;
        const client = createClient({url:URL});
        client.on('error',(err)=>logError(err));
        await client.connect();
        await client.set();
    }
}




//client.on('error', err => console.log('Redis Client Error', err));