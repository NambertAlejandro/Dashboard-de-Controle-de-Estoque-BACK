import historicoAtividadesRepository from './historicoAtividadesRepository.js'
import { pool } from '../database/connection.js'
import movimentacoesEstoqueRepository from './movimentacoesEstoqueRepository.js'

const lotesRepository = {
  async listar(usuarioId) {
    return (await pool.query('SELECT l.* FROM lotes l JOIN produtos p ON p.id=l.produto_id WHERE p.usuario_id=$1 ORDER BY l.id DESC',[usuarioId])).rows
  },
  async buscarPorId(id, usuarioId) {
    return (await pool.query('SELECT l.* FROM lotes l JOIN produtos p ON p.id=l.produto_id WHERE l.id=$1 AND p.usuario_id=$2',[id,usuarioId])).rows[0]
  },
  async buscarProduto(id, usuarioId) {
    return (await pool.query('SELECT * FROM produtos WHERE id=$1 AND usuario_id=$2',[id,usuarioId])).rows[0]
  },
  async buscarFornecedor(id, usuarioId) {
    return (await pool.query('SELECT id FROM fornecedores WHERE id=$1 AND usuario_id=$2',[id,usuarioId])).rows[0]
  },
  async buscarLocal(id, usuarioId) {
    return (await pool.query('SELECT id FROM locais_estoque WHERE id=$1 AND usuario_id=$2',[id,usuarioId])).rows[0]
  },
  async criar(dados, conexao = null) {
    const cliente = conexao || await pool.connect()
    try {
      if (!conexao) {
        await cliente.query('BEGIN')
        await historicoAtividadesRepository.bloquear(cliente)
      }
      const antes = !conexao ? await historicoAtividadesRepository.capturar(cliente,[dados.produto_id]) : null
      // O nome espirationDate é exatamente o que existe hoje no Neon.
      const lote = (await cliente.query(
        'INSERT INTO lotes (produto_id, "lotNumber", "espirationDate", "quantityReceived", "lostQuantity", "lotPrice", fornecedor_id, local_estoque_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [dados.produto_id,dados.lotNumber,dados.expirationDate,dados.quantityReceived,dados.lostQuantity,dados.lotPrice,dados.fornecedor_id,dados.local_estoque_id]
      )).rows[0]
      const quantidade = Number((dados.quantityReceived - dados.lostQuantity).toFixed(3))
      if (quantidade > 0) {
        await movimentacoesEstoqueRepository.criar({produto_id: dados.produto_id, lote_id: lote.id, quantidade, tipo: 'Entrada', data_movimentacao: dados.data_movimentacao ?? null}, cliente)
      }
      if (!conexao) {
        await historicoAtividadesRepository.registrar(cliente,[dados.produto_id],antes,'create','Cadastro de lote do produto ' + dados.produto_id,dados.usuario_id)
        await cliente.query('COMMIT')
      }
      return lote
    } catch (erro) {
      if (!conexao) await cliente.query('ROLLBACK')
      throw erro
    } finally {
      if (!conexao) cliente.release()
    }
  },
  async atualizar(id, dados, cliente = pool) {
    // Recebimento e perdas são preservados; mudanças de saldo usam Movimentações.
    return (await cliente.query(
      'UPDATE lotes SET "lotNumber"=$1, "espirationDate"=$2, "lotPrice"=$3, fornecedor_id=$4, local_estoque_id=$5 WHERE id=$6 RETURNING *',
      [dados.lotNumber,dados.expirationDate,dados.lotPrice,dados.fornecedor_id,dados.local_estoque_id,id]
    )).rows[0]
  },
  async editarComHistorico(id, dados, produtoId) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const antes = await historicoAtividadesRepository.capturar(cliente,[produtoId])
      const lote = await lotesRepository.atualizar(id,dados,cliente)
      await historicoAtividadesRepository.registrar(cliente,[produtoId],antes,'edit','Edição do lote ' + id,dados.usuario_id)
      await cliente.query('COMMIT')
      return lote
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  },
  async excluir(id, usuarioId) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const lote = (await cliente.query('SELECT l.* FROM lotes l JOIN produtos p ON p.id=l.produto_id WHERE l.id=$1 AND p.usuario_id=$2',[id,usuarioId])).rows[0]
      if (!lote) {
        await cliente.query('ROLLBACK')
        return null
      }
      const antes = await historicoAtividadesRepository.capturar(cliente,[lote.produto_id])
      const excluido = (await cliente.query('DELETE FROM lotes WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM movimentacoes_estoque WHERE lote_id=$1) RETURNING *',[id])).rows[0]
      if (!excluido) {
        await cliente.query('ROLLBACK')
        return null
      }
      await historicoAtividadesRepository.registrar(cliente,[lote.produto_id],antes,'delete','Exclusão do lote ' + id,usuarioId)
      await cliente.query('COMMIT')
      return excluido
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  }
}
export default lotesRepository
