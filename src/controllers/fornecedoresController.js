import fornecedoresRepository from "../repositories/fornecedoresRepository.js"

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
  if (typeof dados?.nome !== "string" || !dados.nome.trim() || dados.nome.trim().length > 120) {
    falhar("invalido", "Informe um nome de 1 a 120 caracteres.")
  }
  return dados.nome.trim()
}

const fornecedoresController = {
  async listar() {
    return await fornecedoresRepository.listar()
  },

  async buscarPorId(valor) {
    const id = validarId(valor)
    const categoria = await fornecedoresRepository.buscarPorId(id)
    if (!categoria) falhar("nao_encontrado", "Registro não encontrado.")
    return categoria
  },

  async criar(dados) {
    const nome = validarNome(dados)
    return await fornecedoresRepository.criar(nome)
  },

  async atualizar(valor, dados) {
    const id = validarId(valor)
    const nome = validarNome(dados)
    // O lote guarda o ID, então renomear mantém a ligação.
    const categoria = await fornecedoresRepository.atualizar(id, nome)
    if (!categoria) falhar("nao_encontrado", "Registro não encontrado.")
    return categoria
  },

  async excluir(valor) {
    const id = validarId(valor)
    const categoria = await fornecedoresRepository.excluir(id)
    if (!categoria) {
      // A consulta só exclui fornecedores sem produtos associados.
      const existente = await fornecedoresRepository.buscarPorId(id)
      if (existente) falhar("conflito", "Este registro está em uso por um lote.")
      falhar("nao_encontrado", "Registro não encontrado.")
    }
    return categoria
  },
}

export default fornecedoresController
