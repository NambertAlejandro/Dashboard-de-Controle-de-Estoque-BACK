import lotesController from './lotesController.js'
import produtosRepository from "../repositories/produtosRepository.js"

// Erros de negócio têm um motivo; a rota decide qual status HTTP enviar.
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

function validarNumero(valor, casas, limite, campo) {
  // Aceita números do JSON e textos numéricos de inputs, mas não vazio/null/boolean.
  if ((typeof valor !== "number" && typeof valor !== "string") || String(valor).trim() === "") {
    falhar("invalido", campo + " deve ser informado.")
  }
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < 0 || numero >= limite ||
      Math.abs(numero - Number(numero.toFixed(casas))) > 0.0000001) {
    falhar("invalido", campo + " deve ser positivo ou zero e ter até " + casas + " casas decimais.")
  }
  return numero
}

async function validarProduto(dados, usuarioId) {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    falhar("invalido", "Envie os dados do produto em JSON.")
  }
  if (typeof dados.name !== "string" || !dados.name.trim() || dados.name.trim().length > 120) {
    falhar("invalido", "Informe um nome de 1 a 120 caracteres.")
  }
  if (typeof dados.sku !== "string" || !dados.sku.trim() || dados.sku.trim().length > 50) {
    falhar("invalido", "Informe um SKU em texto de 1 a 50 caracteres.")
  }
  const tipos = ["resale", "ingredient", "intermediate", "prepared", "packaging"]
  if (!tipos.includes(dados.itemType)) falhar("invalido", "Tipo de item inválido.")
  if (dados.notes != null && (typeof dados.notes !== "string" || dados.notes.length > 300)) {
    falhar("invalido", "Observações devem ser um texto de até 300 caracteres.")
  }

  const produto = {
    name: dados.name.trim(),
    sku: dados.sku.trim(),
    itemType: dados.itemType,
    unitPrice: validarNumero(dados.unitPrice, 2, 1000000000000, "Preço unitário"),
    minStock: validarNumero(dados.minStock, 3, 100000000000, "Estoque mínimo"),
    categoria_id: validarId(dados.categoria_id),
    unidade_medida_id: validarId(dados.unidade_medida_id),
    notes: dados.notes?.trim() || null,
    usuario_id: usuarioId,
  }

  // No MVP ainda não temos todas as chaves estrangeiras no banco.
  // Por isso conferimos os IDs antes de cadastrar ou editar.
  if (!await produtosRepository.buscarCategoria(produto.categoria_id,usuarioId)) {
    falhar("invalido", "Categoria não encontrada. Cadastre a categoria primeiro.")
  }
  if (!await produtosRepository.buscarUnidade(produto.unidade_medida_id,usuarioId)) {
    falhar("invalido", "Unidade de medida não encontrada. Cadastre a unidade primeiro.")
  }
  return produto
}

const produtosController = {
  async listar(usuarioId) {
    return await produtosRepository.listar(usuarioId)
  },

  async buscarPorId(valor, usuarioId) {
    const id = validarId(valor)
    const produto = await produtosRepository.buscarPorId(id,usuarioId)
    if (!produto) falhar("nao_encontrado", "Produto não encontrado.")
    return produto
  },

  async buscarPorSku(sku, usuarioId) {
    if (typeof sku !== "string" || !sku.trim() || sku.trim().length > 50) {
      falhar("invalido", "Informe um SKU válido.")
    }
    const produto = await produtosRepository.buscarPorSku(sku.trim(),usuarioId)
    if (!produto) falhar("nao_encontrado", "Produto não encontrado.")
    return produto
  },

  async criar(dados, usuarioId) {
    const produto = await validarProduto(dados,usuarioId)
    const lote = dados.lote ? await lotesController.validar(dados.lote,usuarioId) : null
    if (lote && produto.itemType === 'prepared') falhar('invalido','Produto preparado não possui lote.')
    return await produtosRepository.salvarComLote(produto,lote)
  },

  async atualizar(valor, dados, usuarioId) {
    const atual = await produtosController.buscarPorId(valor,usuarioId)
    const produto = await validarProduto(dados,usuarioId)
    // O formulário já preserva o tipo após o cadastro. Mantemos essa regra na API.
    if (produto.itemType !== atual.itemType) {
      falhar("invalido", "O tipo do item não pode ser alterado após o cadastro.")
    }
    if (produto.unidade_medida_id !== atual.unidade_medida_id &&
        await produtosRepository.possuiRegistros(atual.id)) {
      falhar("conflito", "Não altere a unidade de um produto que já possui lotes ou movimentações.")
    }
    let lote = dados.lote ? await lotesController.validar(dados.lote,usuarioId) : null
    if (lote && produto.itemType === 'prepared') falhar('invalido','Produto preparado não possui lote.')
    if (lote && dados.lote.id) {
      const existente = await lotesController.buscarPorId(dados.lote.id,usuarioId)
      if (existente.produto_id !== atual.id || Number(existente.quantityReceived) !== lote.quantityReceived || Number(existente.lostQuantity) !== lote.lostQuantity) falhar('conflito','Confira o lote; recebimento e perdas são preservados.')
      lote.id = existente.id
    }
    const atualizado = await produtosRepository.salvarComLote(produto,lote,atual.id)
    if (!atualizado) falhar("nao_encontrado", "Produto não encontrado.")
    return atualizado
  },

  async excluirVarios(dados, usuarioId) {
    if (!Array.isArray(dados?.ids) || !dados.ids.length) falhar('invalido','Selecione pelo menos um produto.')
    const ids = [...new Set(dados.ids.map(validarId))]
    return await produtosRepository.excluirVarios(ids,usuarioId)
  },
  async excluir(valor, usuarioId) {
    return await produtosRepository.excluirVarios([validarId(valor)],usuarioId)
  },
}

export default produtosController
