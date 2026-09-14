import unidadesMedidaRepository from "../repositories/unidadesMedidaRepository.js"

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

function validarSimbolo(dados) {
  if (typeof dados?.simbolo !== "string" || !dados.simbolo.trim()) {
    falhar("invalido", "Informe o símbolo da unidade, como un, kg ou L.")
  }
  // Retiramos espaços nas pontas, mas preservamos maiúsculas, como em L.
  return dados.simbolo.trim()
}

const unidadesMedidaController = {
  async listar(usuarioId) {
    return await unidadesMedidaRepository.listar(usuarioId)
  },

  async buscarPorId(valor, usuarioId) {
    const id = validarId(valor)
    const unidade = await unidadesMedidaRepository.buscarPorId(id,usuarioId)
    if (!unidade) falhar("nao_encontrado", "Unidade de medida não encontrada.")
    return unidade
  },

  async criar(dados, usuarioId) {
    const simbolo = validarSimbolo(dados)
    return await unidadesMedidaRepository.criar(simbolo,usuarioId)
  },

  async atualizar(valor, dados, usuarioId) {
    const unidade = await unidadesMedidaController.buscarPorId(valor,usuarioId)
    const simbolo = validarSimbolo(dados)
    // Trocar kg por caixa mudaria o significado do estoque de todos os produtos.
    // Para uma unidade já usada, cadastre outra em vez de renomeá-la.
    if (simbolo !== unidade.simbolo && await unidadesMedidaRepository.estaEmUso(unidade.id,usuarioId)) {
      falhar("conflito", "Esta unidade está em uso. Cadastre outra unidade em vez de alterar seu símbolo.")
    }
    const atualizada = await unidadesMedidaRepository.atualizar(unidade.id,simbolo,usuarioId)
    if (!atualizada) falhar("nao_encontrado", "Unidade de medida não encontrada.")
    return atualizada
  },

  async excluir(valor, usuarioId) {
    const unidade = await unidadesMedidaController.buscarPorId(valor,usuarioId)
    if (await unidadesMedidaRepository.estaEmUso(unidade.id,usuarioId)) {
      falhar("conflito", "Esta unidade está em uso por um produto e não pode ser excluída.")
    }
    const excluida = await unidadesMedidaRepository.excluir(unidade.id,usuarioId)
    if (!excluida) falhar("conflito", "A unidade mudou ou passou a ser usada por um produto.")
    return excluida
  },
}

export default unidadesMedidaController
