
import Fastify from 'fastify'
import categoriasRoutes from './routes/categoriasRoutes.js'
import { pool } from './database/connection.js'

const fastify = Fastify({
  logger: true
})

// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})

fastify.register(categoriasRoutes, { prefix: '/categorias' })
fastify.addHook('onClose', async () => { await pool.end() })
