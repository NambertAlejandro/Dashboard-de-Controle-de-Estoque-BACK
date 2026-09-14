import locaisEstoqueController from "../controllers/locaisEstoqueController.js"

export default async function locaisEstoqueRoutes(fastify) {
  // O controller valida; somente as rotas decidem os códigos HTTP.
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === "invalido") return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === "nao_encontrado") return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === "conflito") return reply.code(409).send({ erro: erro.message })
    if (erro.code === "23505") return reply.code(409).send({ erro: "Já existe um registro com esse nome." })
    if (erro.code === "23503") return reply.code(409).send({ erro: "Este registro está em uso por um lote." })
    if (erro.statusCode >= 400 && erro.statusCode < 500) {
      return reply.code(erro.statusCode).send({ erro: "Requisição inválida. Confira o JSON enviado." })
    }
    request.log.error({ codigo: erro.code }, "Falha ao acessar locaisEstoque")
    return reply.code(500).send({ erro: "Não foi possível acessar as locaisEstoque." })
  })

  fastify.get("/", async () => {
    return await locaisEstoqueController.listar()
  })
  fastify.get("/listar", async () => {
    return await locaisEstoqueController.listar()
  })
  fastify.get("/:id", async (request) => {
    return await locaisEstoqueController.buscarPorId(request.params.id)
  })
  fastify.post("/", async (request, reply) => {
    const categoria = await locaisEstoqueController.criar(request.body)
    return reply.code(201).send(categoria)
  })
  fastify.put("/:id", async (request, reply) => {
    const categoria = await locaisEstoqueController.atualizar(request.params.id, request.body)
    return reply.code(200).send(categoria)
  })
  fastify.delete("/:id", async (request, reply) => {
    await locaisEstoqueController.excluir(request.params.id)
    return reply.code(204).send()
  })
}
