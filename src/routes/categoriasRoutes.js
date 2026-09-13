import categoriasController from "../controllers/categoriasController.js"

export default async function categoriasRoutes(fastify) {
  fastify.get("/", categoriasController.listar)
  fastify.get("/:id", categoriasController.buscarPorId)
  fastify.post("/", categoriasController.criar)
  fastify.put("/:id", categoriasController.atualizar)
  fastify.delete("/:id", categoriasController.excluir)
}
