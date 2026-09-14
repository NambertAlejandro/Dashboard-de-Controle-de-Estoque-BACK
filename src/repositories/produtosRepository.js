import lotesRepository from './lotesRepository.js'
import historicoAtividadesRepository from './historicoAtividadesRepository.js'
import { pool } from "../database/connection.js"

const produtosRepository = {
  async listar() {
    const resultado = await pool.query("SELECT * FROM produtos ORDER BY id")
    return resultado.rows
  },

  async buscarPorId(id) {
    const resultado = await pool.query("SELECT * FROM produtos WHERE id = $1", [id])
    return resultado.rows[0]
  },

  async buscarPorSku(sku) {
    const resultado = await pool.query("SELECT * FROM produtos WHERE sku = $1", [sku])
    return resultado.rows[0]
  },

  async buscarCategoria(id) {
    const resultado = await pool.query("SELECT id FROM categorias WHERE id = $1", [id])
    return resultado.rows[0]
  },

  async buscarUnidade(id) {
    const resultado = await pool.query("SELECT id FROM unidades_medida WHERE id = $1", [id])
    return resultado.rows[0]
  },

  async criar(produto, cliente = pool) {
    // Aspas duplas preservam os nomes com maiúsculas criados no Neon.
    // Os valores são enviados separados do SQL por meio de $1, $2 etc.
    const resultado = await cliente.query(
      `INSERT INTO produtos
       (name, sku, "itemType", "unitPrice", "minStock", categoria_id, unidade_medida_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [produto.name, produto.sku, produto.itemType, produto.unitPrice,
       produto.minStock, produto.categoria_id, produto.unidade_medida_id, produto.notes]
    )
    return resultado.rows[0]
  },

  async atualizar(id, produto, cliente = pool) {
    // Não alteramos quantidade aqui: o saldo pertence às movimentações.
    const resultado = await cliente.query(
      `UPDATE produtos SET name = $1, sku = $2, "unitPrice" = $3,
       "minStock" = $4, categoria_id = $5, unidade_medida_id = $6, notes = $7
       WHERE id = $8 RETURNING *`,
      [produto.name, produto.sku, produto.unitPrice, produto.minStock,
       produto.categoria_id, produto.unidade_medida_id, produto.notes, id]
    )
    return resultado.rows[0]
  },

  async salvarComLote(produto, lote, produtoId = null) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const copia = await historicoAtividadesRepository.capturar(cliente,produtoId ? [produtoId] : [])
      const antes = produtoId ? (await cliente.query('SELECT * FROM produtos WHERE id=$1 FOR UPDATE',[produtoId])).rows : []
      if (produtoId && !antes.length) {
        const erro = new Error('Produto não encontrado.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      const salvo = produtoId ? await produtosRepository.atualizar(produtoId,produto,cliente) : await produtosRepository.criar(produto,cliente)
      if (lote) {
        if (lote.id) await lotesRepository.atualizar(lote.id,lote,cliente)
        else await lotesRepository.criar({...lote,produto_id:salvo.id},cliente)
      }
      await historicoAtividadesRepository.registrar(cliente,[salvo.id],copia,produtoId ? 'edit' : 'create',(produtoId ? 'Edição de ' : 'Cadastro de ') + salvo.name)
      await cliente.query('COMMIT')
      return salvo
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  },

  async excluirVarios(ids) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const antes = await historicoAtividadesRepository.capturar(cliente,ids)
      if (antes.produtos.length !== ids.length) {
        const erro = new Error('Um dos produtos não existe mais. Atualize a lista.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      await cliente.query('DELETE FROM movimentacoes_estoque WHERE produto_id=ANY($1::int[])',[ids])
      await cliente.query('DELETE FROM lotes WHERE produto_id=ANY($1::int[])',[ids])
      await cliente.query('DELETE FROM produtos WHERE id=ANY($1::int[])',[ids])
      await historicoAtividadesRepository.registrar(cliente,ids,antes,'delete','Exclusão de ' + ids.length + ' item(ns): ' + antes.produtos.map(p => p.name).join(', '))
      await cliente.query('COMMIT')
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  },

  async possuiRegistros(id) {
    const resultado = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM lotes WHERE produto_id = $1)
       OR EXISTS (SELECT 1 FROM movimentacoes_estoque WHERE produto_id = $1) AS possui`, [id]
    )
    return resultado.rows[0].possui
  },

}

export default produtosRepository
