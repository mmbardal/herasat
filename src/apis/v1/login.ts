import * as fastify from 'fastify'
import fastifies from 'fastify'
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerResponse } from 'http2';
import {schema,loginType} from '../../schema/panel'
import { send } from 'process';
import {validate} from'../../utils'
import { error } from 'console';
import * as bcrypt from 'bcrypt';

module.exports = function (fastifier: fastify.FastifyInstance,opts:fastify.RouteOptions,done:fastify.HookHandlerDoneFunction){
    
    fastifier.post('/login',login)
    done();
}




export class Exep extends Error{}
  

function login(request:fastify.FastifyRequest,reply:fastify.FastifyReply) {

    JSON.parse(request.body as string) as loginType ;
         
        var jbody: loginType;
         try{
            jbody = JSON.parse(request.body as string) as loginType ;
            validate<loginType>(jbody,schema.loginValidate);
         }catch(e:unknown){

            reply.code(400).send({message:'badrequest'})
            throw new Exep();
         }

        const username = jbody.username;
        const password = jbody.password;
        //todo:  load row from db and compare with bcrypt
        //if true => send token and save to redis
        //else => incorrect password with code 200
        bcrypt
        
        

        
        

        
         
               
}