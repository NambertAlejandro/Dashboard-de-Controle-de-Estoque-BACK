import lotesController from "../controllers/lotesController.js"

export default async function lotesRoutes(fastify) {
  // O controller valida; somente as rotas decidem os códigos HTTP.
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === "invalido") return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === "nao_encontrado") return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === "conflito") return reply.code(409).send({ erro: erro.message })
    if (erro.code === "23505") return reply.code(409).send({ erro: "Já existe uma lote com esse nome." })
    if (erro.code === "23503") return reply.code(409).send({ erro: "Esta lote está em uso por um registro." })
    if (erro.statusCode >= 400 && erro.statusCode < 500) {
      return reply.code(erro.statusCode).send({ erro: "Requisição inválida. Confira o JSON enviado." })
    }
    request.log.error({ codigo: erro.code }, "Falha ao acessar lotes")
    return reply.code(500).send({ erro: "Não foi possível acessar as lotes." })
  })

  fastify.get("/", async () => {
    return await lotesController.listar()
  })
  fastify.get("/listar", async () => {
    return await lotesController.listar()
  })
  fastify.get("/:id", async (request) => {
    return await lotesController.buscarPorId(request.params.id)
  })
  fastify.post("/", async (request, reply) => {
    const lote = await lotesController.criar(request.body)
    return reply.code(201).send(lote)
  })
  fastify.put("/:id", async (request, reply) => {
    const lote = await lotesController.atualizar(request.params.id, request.body)
    return reply.code(200).send(lote)
  })
  fastify.delete("/:id", async (request, reply) => {
    await lotesController.excluir(request.params.id)
    return reply.code(204).send()
  })
}
