import lotesRepository from './lotesRepository.js'
import historicoAtividadesRepository from './historicoAtividadesRepository.js'
import { pool } from "../database/connection.js"

const produtosRepository = {
  async listar(usuarioId) {
    const resultado = await pool.query("SELECT * FROM produtos WHERE usuario_id=$1 ORDER BY id",[usuarioId])
    return resultado.rows
  },

  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query("SELECT * FROM produtos WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async buscarPorSku(sku, usuarioId) {
    const resultado = await pool.query("SELECT * FROM produtos WHERE sku = $1 AND usuario_id=$2", [sku,usuarioId])
    return resultado.rows[0]
  },

  async buscarCategoria(id, usuarioId) {
    const resultado = await pool.query("SELECT id FROM categorias WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async buscarUnidade(id, usuarioId) {
    const resultado = await pool.query("SELECT id FROM unidades_medida WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async criar(produto, cliente = pool) {
    // Aspas duplas preservam os nomes com maiúsculas criados no Neon.
    // Os valores são enviados separados do SQL por meio de $1, $2 etc.
    const resultado = await cliente.query(
      `INSERT INTO produtos
       (name, sku, "itemType", "unitPrice", "minStock", categoria_id, unidade_medida_id, notes, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [produto.name, produto.sku, produto.itemType, produto.unitPrice,
       produto.minStock, produto.categoria_id, produto.unidade_medida_id, produto.notes, produto.usuario_id]
    )
    return resultado.rows[0]
  },

  async atualizar(id, produto, cliente = pool) {
    // Não alteramos quantidade aqui: o saldo pertence às movimentações.
    const resultado = await cliente.query(
      `UPDATE produtos SET name = $1, sku = $2, "unitPrice" = $3,
       "minStock" = $4, categoria_id = $5, unidade_medida_id = $6, notes = $7
       WHERE id = $8 AND usuario_id=$9 RETURNING *`,
      [produto.name, produto.sku, produto.unitPrice, produto.minStock,
       produto.categoria_id, produto.unidade_medida_id, produto.notes, id, produto.usuario_id]
    )
    return resultado.rows[0]
  },

  async salvarComLote(produto, lote, produtoId = null) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const copia = await historicoAtividadesRepository.capturar(cliente,produtoId ? [produtoId] : [])
      const antes = produtoId ? (await cliente.query('SELECT * FROM produtos WHERE id=$1 AND usuario_id=$2 FOR UPDATE',[produtoId,produto.usuario_id])).rows : []
      if (produtoId && !antes.length) {
        const erro = new Error('Produto não encontrado.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      const salvo = produtoId ? await produtosRepository.atualizar(produtoId,produto,cliente) : await produtosRepository.criar(produto,cliente)
      if (lote) {
        lote.usuario_id = produto.usuario_id
        if (lote.id) await lotesRepository.atualizar(lote.id,lote,cliente)
        else await lotesRepository.criar({...lote,produto_id:salvo.id},cliente)
      }
      await historicoAtividadesRepository.registrar(cliente,[salvo.id],copia,produtoId ? 'edit' : 'create',(produtoId ? 'Edição de ' : 'Cadastro de ') + salvo.name,produto.usuario_id)
      await cliente.query('COMMIT')
      return salvo
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  },

  async excluirVarios(ids, usuarioId) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const idsDoUsuario = (await cliente.query('SELECT id FROM produtos WHERE id=ANY($1::int[]) AND usuario_id=$2',[ids,usuarioId])).rows.map(item => item.id)
      const antes = await historicoAtividadesRepository.capturar(cliente,idsDoUsuario)
      if (antes.produtos.length !== ids.length) {
        const erro = new Error('Um dos produtos não existe mais. Atualize a lista.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      await cliente.query('DELETE FROM movimentacoes_estoque WHERE produto_id=ANY($1::int[])',[idsDoUsuario])
      await cliente.query('DELETE FROM lotes WHERE produto_id=ANY($1::int[])',[idsDoUsuario])
      await cliente.query('DELETE FROM produtos WHERE id=ANY($1::int[])',[idsDoUsuario])
      await historicoAtividadesRepository.registrar(cliente,idsDoUsuario,antes,'delete','Exclusão de ' + ids.length + ' item(ns): ' + antes.produtos.map(p => p.name).join(', '),usuarioId)
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
