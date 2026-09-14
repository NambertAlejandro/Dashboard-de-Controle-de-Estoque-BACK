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
  async listar() {
    return await categoriasRepository.listar()
  },

  async buscarPorId(valor) {
    const id = validarId(valor)
    const categoria = await categoriasRepository.buscarPorId(id)
    if (!categoria) falhar("nao_encontrado", "Categoria não encontrada.")
    return categoria
  },

  async criar(dados) {
    const nome = validarNome(dados)
    return await categoriasRepository.criar(nome)
  },

  async atualizar(valor, dados) {
    const id = validarId(valor)
    const nome = validarNome(dados)
    // Produtos guardam o ID, então renomear a categoria mantém a ligação.
    const categoria = await categoriasRepository.atualizar(id, nome)
    if (!categoria) falhar("nao_encontrado", "Categoria não encontrada.")
    return categoria
  },

  async excluir(valor) {
    const id = validarId(valor)
    const categoria = await categoriasRepository.excluir(id)
    if (!categoria) {
      // A consulta só exclui categorias sem produtos associados.
      const existente = await categoriasRepository.buscarPorId(id)
      if (existente) falhar("conflito", "Esta categoria está em uso por um produto.")
      falhar("nao_encontrado", "Categoria não encontrada.")
    }
    return categoria
  },
}

export default categoriasController
