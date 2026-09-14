import unidadesMedidaController from "../controllers/unidadesMedidaController.js"

export default async function unidadesMedidaRoutes(fastify) {
  // O controller informa o motivo do erro; somente a rota define o status HTTP.
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === "invalido") return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === "nao_encontrado") return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === "conflito") return reply.code(409).send({ erro: erro.message })
    if (erro.code === "23505") return reply.code(409).send({ erro: "Já existe uma unidade com esse símbolo." })
    if (erro.code === "23503") return reply.code(409).send({ erro: "Esta unidade está em uso." })
    if (erro.statusCode >= 400 && erro.statusCode < 500) {
      return reply.code(erro.statusCode).send({ erro: "Requisição inválida. Confira o JSON enviado." })
    }
    request.log.error({ codigo: erro.code }, "Falha ao acessar unidades de medida")
    return reply.code(500).send({ erro: "Não foi possível acessar as unidades de medida." })
  })

  fastify.get("/", async () => {
    return await unidadesMedidaController.listar()
  })
  fastify.get("/listar", async () => {
    return await unidadesMedidaController.listar()
  })
  fastify.get("/:id", async (request) => {
    return await unidadesMedidaController.buscarPorId(request.params.id)
  })
  fastify.post("/", async (request, reply) => {
    const unidade = await unidadesMedidaController.criar(request.body)
    return reply.code(201).send(unidade)
  })
  fastify.put("/:id", async (request, reply) => {
    const unidade = await unidadesMedidaController.atualizar(request.params.id, request.body)
    return reply.code(200).send(unidade)
  })
  fastify.delete("/:id", async (request, reply) => {
    await unidadesMedidaController.excluir(request.params.id)
    return reply.code(204).send()
  })
}
