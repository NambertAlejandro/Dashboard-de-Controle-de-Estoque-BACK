import lotesRepository from '../repositories/lotesRepository.js'

function falhar(motivo, mensagem) {
  const erro = new Error(mensagem)
  erro.motivo = motivo
  throw erro
}
function id(valor) {
  const numero = Number(valor)
  if (!/^[0-9]+$/.test(String(valor)) || !Number.isInteger(numero) || numero <= 0 || numero > 2147483647) falhar('invalido','Informe um ID válido.')
  return numero
}
function numero(valor, casas, limite) {
  const n = Number(valor)
  if (!['string','number'].includes(typeof valor) || String(valor).trim() === '' || !Number.isFinite(n) || n < 0 || n >= limite || Math.abs(n - Number(n.toFixed(casas))) > 0.0000001) falhar('invalido','Confira as quantidades e o preço do lote.')
  return n
}
const lotesController = {
  async listar(usuarioId) { return await lotesRepository.listar(usuarioId) },
  async buscarPorId(valor, usuarioId) {
    const lote = await lotesRepository.buscarPorId(id(valor),usuarioId)
    if (!lote) falhar('nao_encontrado','Lote não encontrado.')
    return lote
  },
  async validar(dados, usuarioId) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) falhar('invalido','Envie os dados do lote.')
    const data = dados.expirationDate || null
    for (const data of [dados.expirationDate || null, dados.data_movimentacao ?? null]) {
    if (data !== null) {
      const teste = new Date(data + 'T00:00:00Z')
      if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data) || data.startsWith('0000') || Number.isNaN(teste.getTime()) || teste.toISOString().slice(0,10) !== data) falhar('invalido','Validade inválida. Use AAAA-MM-DD.')
    }
    }
    if (dados.lotNumber != null && (typeof dados.lotNumber !== 'string' || dados.lotNumber.length > 60)) falhar('invalido','Número do lote deve ter até 60 caracteres.')
    const lote = {
      data_movimentacao: dados.data_movimentacao ?? null,
      lotNumber: dados.lotNumber?.trim() || null, expirationDate: data,
      quantityReceived: numero(dados.quantityReceived,3,100000000000),
      lostQuantity: numero(dados.lostQuantity ?? 0,3,100000000000),
      lotPrice: numero(dados.lotPrice,2,1000000000000),
      fornecedor_id: dados.fornecedor_id == null ? null : id(dados.fornecedor_id),
      local_estoque_id: dados.local_estoque_id == null ? null : id(dados.local_estoque_id)
    }
    if (lote.lostQuantity > lote.quantityReceived) falhar('invalido','As perdas não podem superar o recebimento.')
    if (lote.fornecedor_id && !await lotesRepository.buscarFornecedor(lote.fornecedor_id,usuarioId)) falhar('invalido','Fornecedor não encontrado.')
    if (lote.local_estoque_id && !await lotesRepository.buscarLocal(lote.local_estoque_id,usuarioId)) falhar('invalido','Local de estoque não encontrado.')
    return lote
  },
  async criar(dados, usuarioId) {
    const lote = await lotesController.validar(dados,usuarioId)
    lote.usuario_id = usuarioId
    lote.produto_id = id(dados.produto_id)
    const produto = await lotesRepository.buscarProduto(lote.produto_id,usuarioId)
    if (!produto) falhar('nao_encontrado','Produto não encontrado.')
    if (produto.itemType === 'prepared') falhar('invalido','Produto preparado não possui lote de estoque.')
    return await lotesRepository.criar(lote)
  },
  async atualizar(valor,dados,usuarioId) {
    const atual = await lotesController.buscarPorId(valor,usuarioId)
    const lote = await lotesController.validar(dados,usuarioId)
    lote.usuario_id = usuarioId
    if (dados.produto_id != null && id(dados.produto_id) !== atual.produto_id || lote.quantityReceived !== Number(atual.quantityReceived) || lote.lostQuantity !== Number(atual.lostQuantity)) falhar('conflito','Produto, recebimento e perdas do lote são preservados.')
    return await lotesRepository.editarComHistorico(atual.id,lote,atual.produto_id)
  },
  async excluir(valor,usuarioId) {
    const atual = await lotesController.buscarPorId(valor,usuarioId)
    const excluido = await lotesRepository.excluir(atual.id,usuarioId)
    if (!excluido) falhar('conflito','Este lote possui movimentações e não pode ser excluído.')
    return excluido
  }
}
export default lotesController
