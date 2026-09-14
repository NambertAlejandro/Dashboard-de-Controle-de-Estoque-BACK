import cors from '@fastify/cors'
import fornecedoresRoutes from './routes/fornecedoresRoutes.js'
import locaisEstoqueRoutes from './routes/locaisEstoqueRoutes.js'
import lotesRoutes from './routes/lotesRoutes.js'
import movimentacoesEstoqueRoutes from './routes/movimentacoesEstoqueRoutes.js'
import historicoAtividadesRoutes from './routes/historicoAtividadesRoutes.js'

import Fastify from 'fastify'
import categoriasRoutes from './routes/categoriasRoutes.js'
import { pool } from './database/connection.js'
import produtosRoutes from './routes/ProdutosRoutes.js'
import unidadesMedidaRoutes from './routes/unidadesMedidaRoutes.js'
const fastify = Fastify({
  logger: true
})

await fastify.register(cors, { origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : ['http://localhost:5173', 'http://127.0.0.1:5173'], methods: ['GET','POST','PUT','DELETE','OPTIONS'] })
fastify.get('/health', async () => ({ status: 'ok' }))
fastify.register(fornecedoresRoutes, { prefix: '/fornecedores' })
fastify.register(locaisEstoqueRoutes, { prefix: '/locais-estoque' })
fastify.register(lotesRoutes, { prefix: '/lotes' })
fastify.register(produtosRoutes, {
  prefix: "/produtos"
})


fastify.register(unidadesMedidaRoutes, { prefix: '/unidades-medida' })
fastify.register(categoriasRoutes, { prefix: '/categorias' })
fastify.register(movimentacoesEstoqueRoutes, { prefix: '/movimentacoes-estoque' })
fastify.register(historicoAtividadesRoutes, { prefix: '/historico-atividades' })
fastify.addHook('onClose', async () => { await pool.end() })

// Run the server!
fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})

