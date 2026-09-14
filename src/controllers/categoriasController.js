import categoriasRepository from "../repositories/categoriasRepository.js"

function falhar(motivo, mensagem) {
  const erro = new Error(mensagem)
  erro.motivo = motivo
  throw erro
}

function validarId(valor) {
  const id = Number(valor)
  if (!/^[0-9]+$/.test(String(valor)) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
    falhar("invalido", "Informe um ID inteiro maior que zero.")
  }
  return id
}

function validarNome(dados) {
  if (typeof dados?.nome !== "string" || !dados.nome.trim() || dados.nome.trim().length > 80) {
    falhar("invalido", "Informe um nome de 1 a 80 caracteres.")
  }
  return dados.nome.trim()
}

const categoriasController = {
  async listar(usuarioId) {
    return await categoriasRepository.listar(usuarioId)
  },

  async buscarPorId(valor, usuarioId) {
    const id = validarId(valor)
    const categoria = await categoriasRepository.buscarPorId(id,usuarioId)
    if (!categoria) falhar("nao_encontrado", "Categoria não encontrada.")
    return categoria
  },

  async criar(dados, usuarioId) {
    const nome = validarNome(dados)
    return await categoriasRepository.criar(nome,usuarioId)
  },

  async atualizar(valor, dados, usuarioId) {
    const id = validarId(valor)
    const nome = validarNome(dados)
    // Produtos guardam o ID, então renomear a categoria mantém a ligação.
    const categoria = await categoriasRepository.atualizar(id,nome,usuarioId)
    if (!categoria) falhar("nao_encontrado", "Categoria não encontrada.")
    return categoria
  },

  async excluir(valor, usuarioId) {
    const id = validarId(valor)
    const categoria = await categoriasRepository.excluir(id,usuarioId)
    if (!categoria) {
      // A consulta só exclui categorias sem produtos associados.
      const existente = await categoriasRepository.buscarPorId(id,usuarioId)
      if (existente) falhar("conflito", "Esta categoria está em uso por um produto.")
      falhar("nao_encontrado", "Categoria não encontrada.")
    }
    return categoria
  },
}

export default categoriasController
