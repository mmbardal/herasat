
import fastify from 'fastify'
import { Exep } from './apis/v1/login';

const fastifier = fastify()

fastifier.get


fastifier.register(require('@fastify/mysql'), {
    connectionString: 'mysql://root:2003@localhost/herasat',
  })

fastifier.register(require('./apis/v1/login'),{prefix:'/v1'});


fastifier.listen({port: 3000});