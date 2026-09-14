import movimentacoesEstoqueRepository from '../repositories/movimentacoesEstoqueRepository.js'

function validarId(valor) {
  const id = Number(valor)
  if (!/^[0-9]+$/.test(String(valor)) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
    const erro = new Error('Informe um ID inteiro maior que zero.')
    erro.motivo = 'invalido'
    throw erro
  }
  return id
}

function invalidar(mensagem) {
  const erro = new Error(mensagem)
  erro.motivo = 'invalido'
  throw erro
}
const movimentacoesEstoqueController = {
  async listar() {
    return await movimentacoesEstoqueRepository.listar()
  },
  async buscarPorId(valor) {
    const movimentacao = await movimentacoesEstoqueRepository.buscarPorId(validarId(valor))
    if (!movimentacao) {
      const erro = new Error('Movimentação não encontrada.')
      erro.motivo = 'nao_encontrado'
      throw erro
    }
    return movimentacao
  },
  async criar(dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) invalidar('Envie os dados da movimentação.')
    const produto_id = validarId(dados.produto_id)
    const lote_id = dados.lote_id == null ? null : validarId(dados.lote_id)
    const quantidade = Number(dados.quantidade)
    if (!['number', 'string'].includes(typeof dados.quantidade) || !Number.isFinite(quantidade) || quantidade <= 0 || quantidade >= 100000000000 || Math.abs(quantidade - Number(quantidade.toFixed(3))) > 0.0000001) {
      invalidar('Informe uma quantidade positiva com até 3 casas decimais.')
    }
    if (!['Entrada', 'Saída'].includes(dados.tipo)) invalidar('O tipo deve ser Entrada ou Saída.')
    const data = dados.data_movimentacao ?? null
    if (data !== null) {
      const teste = new Date(data + 'T00:00:00Z')
      if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || data.startsWith('0000') || Number.isNaN(teste.getTime()) || teste.toISOString().slice(0, 10) !== data) {
        invalidar('Informe uma data válida no formato AAAA-MM-DD.')
      }
    }
    return await movimentacoesEstoqueRepository.criar({ produto_id, lote_id, quantidade, tipo: dados.tipo, data_movimentacao: data })
  }
}
export default movimentacoesEstoqueController
