import produtosController from "../controllers/produtosController.js"

export default async function produtosRoutes(fastify) {
  // Este tratamento vale somente para as rotas deste módulo de produtos.
  fastify.setErrorHandler((erro, request, reply) => {
    if (erro.motivo === "invalido") return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === "nao_encontrado") return reply.code(404).send({ erro: erro.message })
    if (erro.motivo === "conflito") return reply.code(409).send({ erro: erro.message })
    if (erro.code === "23505") return reply.code(409).send({ erro: "Já existe um produto com esse SKU." })
    if (erro.code === "23503") return reply.code(409).send({ erro: "Confira os registros relacionados a este produto." })
    if (erro.statusCode >= 400 && erro.statusCode < 500) {
      return reply.code(erro.statusCode).send({ erro: "Requisição inválida. Confira o JSON enviado." })
    }
    request.log.error({ codigo: erro.code }, "Falha ao acessar produtos")
    return reply.code(500).send({ erro: "Não foi possível acessar os produtos. Confira a conexão e a estrutura do banco." })
  })

  fastify.post('/excluir-selecionados', async (request, reply) => {
    await produtosController.excluirVarios(request.body,request.user.id)
    return reply.code(204).send()
  })
  fastify.get("/", async (request) => {
    return await produtosController.listar(request.user.id)
  })

  // Mantém o endereço que vocês já testaram no Thunder.
  fastify.get("/listar", async (request) => {
    return await produtosController.listar(request.user.id)
  })

  fastify.get("/sku/:sku", async (request) => {
    return await produtosController.buscarPorSku(request.params.sku,request.user.id)
  })

  fastify.get("/:id", async (request) => {
    return await produtosController.buscarPorId(request.params.id,request.user.id)
  })

  fastify.post("/", async (request, reply) => {
    const produto = await produtosController.criar(request.body,request.user.id)
    return reply.code(201).send(produto)
  })

  fastify.put("/:id", async (request, reply) => {
    const produto = await produtosController.atualizar(request.params.id,request.body,request.user.id)
    return reply.code(200).send(produto)
  })

  fastify.delete("/:id", async (request, reply) => {
    await produtosController.excluir(request.params.id,request.user.id)
    return reply.code(204).send()
  })
}
    
