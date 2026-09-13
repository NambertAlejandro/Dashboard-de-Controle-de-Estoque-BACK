import categoriasRepository from "../repositories/categoriasRepository.js"

function idValido(id) {
  return /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 0
}

function nomeValido(nome) {
  return typeof nome === "string" && nome.trim().length > 0 && nome.trim().length <= 80
}

function responderErro(erro, reply) {
  if (erro.code === "23505") {
    return reply.code(409).send({ erro: "Já existe uma categoria com esse nome." })
  }
  if (erro.code === "23503") {
    return reply.code(409).send({ erro: "Esta categoria está em uso por um produto." })
  }
  return reply.code(500).send({ erro: "Não foi possível acessar as categorias. Confira a conexão e as tabelas do banco." })
}

const categoriasController = {
  async listar(req, reply) {
    try {
      return await categoriasRepository.listar()
    } catch (erro) {
      return responderErro(erro, reply)
    }
  },

  async buscarPorId(req, reply) {
    if (!idValido(req.params.id)) return reply.code(400).send({ erro: "Informe um ID inteiro maior que zero." })
    try {
      const categoria = await categoriasRepository.buscarPorId(Number(req.params.id))
      if (!categoria) return reply.code(404).send({ erro: "Categoria não encontrada." })
      return categoria
    } catch (erro) {
      return responderErro(erro, reply)
    }
  },

  async criar(req, reply) {
    if (!nomeValido(req.body?.nome)) return reply.code(400).send({ erro: "Informe um nome de 1 a 80 caracteres." })
    try {
      const categoria = await categoriasRepository.criar(req.body.nome.trim())
      return reply.code(201).send(categoria)
    } catch (erro) {
      return responderErro(erro, reply)
    }
  },

  async atualizar(req, reply) {
    if (!idValido(req.params.id)) return reply.code(400).send({ erro: "Informe um ID inteiro maior que zero." })
    if (!nomeValido(req.body?.nome)) return reply.code(400).send({ erro: "Informe um nome de 1 a 80 caracteres." })
    try {
      const categoria = await categoriasRepository.atualizar(Number(req.params.id), req.body.nome.trim())
      if (!categoria) return reply.code(404).send({ erro: "Categoria não encontrada." })
      return categoria
    } catch (erro) {
      return responderErro(erro, reply)
    }
  },

  async excluir(req, reply) {
    if (!idValido(req.params.id)) return reply.code(400).send({ erro: "Informe um ID inteiro maior que zero." })
    try {
      const id = Number(req.params.id)
      const categoria = await categoriasRepository.excluir(id)
      if (!categoria) {
        const existente = await categoriasRepository.buscarPorId(id)
        if (existente) return reply.code(409).send({ erro: "Esta categoria está em uso por um produto." })
        return reply.code(404).send({ erro: "Categoria não encontrada." })
      }
      return reply.code(204).send()
    } catch (erro) {
      return responderErro(erro, reply)
    }
  },
}

export default categoriasController
