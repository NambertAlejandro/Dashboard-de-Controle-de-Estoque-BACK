import categoriasController from "../controllers/categoriasController.js"

export default async function categoriasRoutes(fastify) {
  // O controller valida; somente as rotas decidem os códigos HTTP.
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === "invalido") return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === "nao_encontrado") return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === "conflito") return reply.code(409).send({ erro: erro.message })
    if (erro.code === "23505") return reply.code(409).send({ erro: "Já existe uma categoria com esse nome." })
    if (erro.code === "23503") return reply.code(409).send({ erro: "Esta categoria está em uso por um produto." })
    if (erro.statusCode >= 400 && erro.statusCode < 500) {
      return reply.code(erro.statusCode).send({ erro: "Requisição inválida. Confira o JSON enviado." })
    }
    request.log.error({ codigo: erro.code }, "Falha ao acessar categorias")
    return reply.code(500).send({ erro: "Não foi possível acessar as categorias." })
  })

  fastify.get("/", async (request) => {
    return await categoriasController.listar(request.user.id)
  })
  fastify.get("/listar", async (request) => {
    return await categoriasController.listar(request.user.id)
  })
  fastify.get("/:id", async (request) => {
    return await categoriasController.buscarPorId(request.params.id,request.user.id)
  })
  fastify.post("/", async (request, reply) => {
    const categoria = await categoriasController.criar(request.body,request.user.id)
    return reply.code(201).send(categoria)
  })
  fastify.put("/:id", async (request, reply) => {
    const categoria = await categoriasController.atualizar(request.params.id,request.body,request.user.id)
    return reply.code(200).send(categoria)
  })
  fastify.delete("/:id", async (request, reply) => {
    await categoriasController.excluir(request.params.id,request.user.id)
    return reply.code(204).send()
  })
}
