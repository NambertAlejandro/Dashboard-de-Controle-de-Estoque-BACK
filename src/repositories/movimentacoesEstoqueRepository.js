import { pool } from '../database/connection.js'
import historicoAtividadesRepository from './historicoAtividadesRepository.js'

const movimentacoesEstoqueRepository = {
  async listar(usuarioId) {
    const resultado = await pool.query('SELECT m.* FROM movimentacoes_estoque m JOIN produtos p ON p.id=m.produto_id WHERE p.usuario_id=$1 ORDER BY m.id DESC',[usuarioId])
    return resultado.rows
  },
  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query('SELECT m.* FROM movimentacoes_estoque m JOIN produtos p ON p.id=m.produto_id WHERE m.id=$1 AND p.usuario_id=$2',[id,usuarioId])
    return resultado.rows[0]
  },
  async criar(dados, conexao = null) {
    const cliente = conexao || await pool.connect()
    try {
      // Ou salva movimentação e histórico juntos, ou não salva nenhum dos dois.
      if (!conexao) {
        await cliente.query('BEGIN')
        await historicoAtividadesRepository.bloquear(cliente)
      }
      const antes = !conexao ? await historicoAtividadesRepository.capturar(cliente,[dados.produto_id]) : null
      // Duas saídas do mesmo produto precisam conferir o saldo uma por vez.
      const produto = (await cliente.query('SELECT * FROM produtos WHERE id=$1 AND ($2::int IS NULL OR usuario_id=$2) FOR UPDATE',[dados.produto_id,dados.usuario_id || null])).rows[0]
      if (!produto) {
        const erro = new Error('Produto não encontrado.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      if (produto.itemType === 'prepared') {
        const erro = new Error('Produtos preparados não possuem saldo próprio.')
        erro.motivo = 'invalido'
        throw erro
      }
      if (dados.lote_id !== null) {
        const lote = (await cliente.query('SELECT id FROM lotes WHERE id = $1 AND produto_id = $2', [dados.lote_id, dados.produto_id])).rows[0]
        if (!lote) {
          const erro = new Error('O lote não existe ou não pertence a este produto.')
          erro.motivo = 'invalido'
          throw erro
        }
      }
      // O saldo vem das movimentações. O recebimento do lote deve gerar uma Entrada.
      const saldo = (await cliente.query(
        "SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN quantidade ELSE -quantidade END), 0) AS total FROM movimentacoes_estoque WHERE produto_id = $1",
        [dados.produto_id]
      )).rows[0]
      if (dados.tipo === 'Saída' && Number(saldo.total) < dados.quantidade) {
        const erro = new Error('Saldo insuficiente para esta saída.')
        erro.motivo = 'conflito'
        throw erro
      }
      if (dados.tipo === 'Saída' && dados.lote_id !== null) {
        const saldoLote = (await cliente.query(
          "SELECT COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN quantidade ELSE -quantidade END), 0) AS total FROM movimentacoes_estoque WHERE produto_id = $1 AND lote_id = $2",
          [dados.produto_id, dados.lote_id]
        )).rows[0]
        if (Number(saldoLote.total) < dados.quantidade) {
          const erro = new Error('Saldo insuficiente neste lote.')
          erro.motivo = 'conflito'
          throw erro
        }
      }
      const resultado = await cliente.query(
        'INSERT INTO movimentacoes_estoque (produto_id, lote_id, quantidade, tipo, data_movimentacao) VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE)) RETURNING *',
        [dados.produto_id, dados.lote_id, dados.quantidade, dados.tipo, dados.data_movimentacao]
      )
      if (!conexao) await historicoAtividadesRepository.registrar(cliente,[dados.produto_id],antes,'movement',dados.tipo + ' de ' + dados.quantidade + ' de ' + produto.name,produto.usuario_id)
      if (!conexao) await cliente.query('COMMIT')
      return resultado.rows[0]
    } catch (erro) {
      if (!conexao) await cliente.query('ROLLBACK')
      throw erro
    } finally {
      if (!conexao) cliente.release()
    }
  }
}
export default movimentacoesEstoqueRepository
