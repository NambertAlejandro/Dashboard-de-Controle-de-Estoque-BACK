import controller from '../controllers/movimentacoesEstoqueController.js'

export default async function movimentacoesEstoqueRoutes(fastify) {
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === 'invalido') return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === 'nao_encontrado') return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === 'conflito') return reply.code(409).send({ erro: erro.message })
    if (erro.code === '23503') return reply.code(409).send({ erro: 'Confira o produto e o lote informados.' })
    if (erro.statusCode >= 400 && erro.statusCode < 500) return reply.code(erro.statusCode).send({ erro: 'Confira o JSON enviado.' })
    request.log.error({ codigo: erro.code }, 'Falha ao acessar movimentacoesEstoque')
    return reply.code(500).send({ erro: 'Não foi possível concluir a operação.' })
  })
  fastify.get('/', async () => await controller.listar())
  fastify.get('/listar', async () => await controller.listar())
  fastify.get('/:id', async (request) => await controller.buscarPorId(request.params.id))
  fastify.post('/', async (request, reply) => {
    const movimentacao = await controller.criar(request.body)
    return reply.code(201).send(movimentacao)
  })
}
