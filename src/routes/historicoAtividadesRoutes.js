import controller from '../controllers/historicoAtividadesController.js'

export default async function historicoAtividadesRoutes(fastify) {
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === 'invalido') return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === 'nao_encontrado') return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === 'conflito') return reply.code(409).send({ erro: erro.message })
    if (erro.code === '23505') return reply.code(409).send({ erro: 'Um SKU antigo está sendo usado por outro produto. Não foi possível desfazer.' })
    if (erro.code === '23503') return reply.code(409).send({ erro: 'Confira o produto e o lote informados.' })
    if (erro.statusCode >= 400 && erro.statusCode < 500) return reply.code(erro.statusCode).send({ erro: 'Confira o JSON enviado.' })
    request.log.error({ codigo: erro.code }, 'Falha ao acessar historicoAtividades')
    return reply.code(500).send({ erro: 'Não foi possível concluir a operação.' })
  })
  fastify.post('/:id/desfazer', async request => await controller.desfazer(request.params.id,request.user.id))
  fastify.get('/', async request => await controller.listar(request.user.id))
  fastify.get('/listar', async request => await controller.listar(request.user.id))
  fastify.get('/:id', async request => await controller.buscarPorId(request.params.id,request.user.id))
  // O histórico é gravado pelo backend junto da movimentação.
}
