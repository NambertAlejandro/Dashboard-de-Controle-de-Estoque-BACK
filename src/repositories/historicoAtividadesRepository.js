import { pool } from '../database/connection.js'

const historicoAtividadesRepository = {
  // No MVP, operações de estoque aguardam sua vez antes de salvar ou desfazer.
  async bloquear(cliente) {
    await cliente.query('LOCK TABLE produtos, lotes, movimentacoes_estoque, historico_atividades IN SHARE ROW EXCLUSIVE MODE')
  },
  async capturar(cliente, ids) {
    const produtos = (await cliente.query('SELECT * FROM produtos WHERE id = ANY($1::int[]) ORDER BY id',[ids])).rows
    const lotes = (await cliente.query('SELECT * FROM lotes WHERE produto_id = ANY($1::int[]) ORDER BY id',[ids])).rows
    const movimentacoes = (await cliente.query('SELECT * FROM movimentacoes_estoque WHERE produto_id = ANY($1::int[]) ORDER BY id',[ids])).rows
    return { produtos, lotes, movimentacoes }
  },
  async registrar(cliente, ids, antes, tipo, descricao) {
    const depois = await historicoAtividadesRepository.capturar(cliente,ids)
    // As duas colunas JSON guardam o estado anterior; depois permite conferir mudanças.
    return await historicoAtividadesRepository.criar({
      tipo_acao:tipo, descricao,
      produtos_antes:{versao:1,ids,produtos:antes.produtos,lotes:antes.lotes,depois},
      movimentacoes_antes:antes.movimentacoes
    },cliente)
  },
  async desfazer(id) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const atividade = (await cliente.query('SELECT * FROM historico_atividades WHERE id=$1',[id])).rows[0]
      if (!atividade) {
        const erro = new Error('Atividade não encontrada.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      const ultima = (await cliente.query('SELECT id FROM historico_atividades WHERE desfeita=false ORDER BY id DESC LIMIT 1')).rows[0]
      const dados = atividade.produtos_antes
      if (atividade.desfeita || ultima?.id !== id || dados?.versao !== 1) {
        const erro = new Error('Só é possível desfazer a atividade mais recente que possui cópia completa.')
        erro.motivo = 'conflito'
        throw erro
      }
      const atual = await historicoAtividadesRepository.capturar(cliente,dados.ids)
      // Compara conteúdo, sem depender da ordem das chaves devolvidas pelo JSONB.
      const mesmo = (await cliente.query('SELECT $1::jsonb = $2::jsonb AS igual',[JSON.stringify(atual),JSON.stringify(dados.depois)])).rows[0].igual
      if (!mesmo) {
        const erro = new Error('Estes dados mudaram depois da atividade. Atualize o estoque antes de corrigir.')
        erro.motivo = 'conflito'
        throw erro
      }
      // Confere referências antes de restaurar, mesmo sem chaves estrangeiras no MVP.
      for (const produto of dados.produtos) {
        const referencias = (await cliente.query('SELECT EXISTS(SELECT 1 FROM categorias WHERE id=$1) AND EXISTS(SELECT 1 FROM unidades_medida WHERE id=$2) AS ok',[produto.categoria_id,produto.unidade_medida_id])).rows[0]
        if (!referencias.ok) {
          const erro = new Error('A categoria ou unidade usada pelo produto foi removida. Não é possível restaurar.')
          erro.motivo = 'conflito'
          throw erro
        }
      }
      for (const lote of dados.lotes) {
        const referencias = (await cliente.query('SELECT ($1::int IS NULL OR EXISTS(SELECT 1 FROM fornecedores WHERE id=$1)) AND ($2::int IS NULL OR EXISTS(SELECT 1 FROM locais_estoque WHERE id=$2)) AS ok',[lote.fornecedor_id,lote.local_estoque_id])).rows[0]
        if (!referencias.ok) {
          const erro = new Error('O fornecedor ou local usado pelo lote foi removido. Não é possível restaurar.')
          erro.motivo = 'conflito'
          throw erro
        }
      }
      // Primeiro retira os registros dependentes, depois restaura com os mesmos IDs.
      await cliente.query('DELETE FROM movimentacoes_estoque WHERE produto_id=ANY($1::int[])',[dados.ids])
      await cliente.query('DELETE FROM lotes WHERE produto_id=ANY($1::int[])',[dados.ids])
      await cliente.query('DELETE FROM produtos WHERE id=ANY($1::int[])',[dados.ids])
      // OVERRIDING SYSTEM VALUE permite recuperar o ID antigo de uma coluna identity.
      for (const produto of dados.produtos) {
        await cliente.query('INSERT INTO produtos (id,name,sku,"itemType","unitPrice","minStock",categoria_id,unidade_medida_id,notes) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[produto.id,produto.name,produto.sku,produto.itemType,produto.unitPrice,produto.minStock,produto.categoria_id,produto.unidade_medida_id,produto.notes])
      }
      for (const lote of dados.lotes) {
        await cliente.query('INSERT INTO lotes (id,produto_id,"lotNumber","espirationDate","quantityReceived","lostQuantity","lotPrice",fornecedor_id,local_estoque_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[lote.id,lote.produto_id,lote.lotNumber,lote.espirationDate,lote.quantityReceived,lote.lostQuantity,lote.lotPrice,lote.fornecedor_id,lote.local_estoque_id])
      }
      for (const movimento of atividade.movimentacoes_antes) {
        await cliente.query('INSERT INTO movimentacoes_estoque (id,produto_id,lote_id,quantidade,tipo,data_movimentacao) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5,$6)',[movimento.id,movimento.produto_id,movimento.lote_id,movimento.quantidade,movimento.tipo,movimento.data_movimentacao])
      }
      await cliente.query('UPDATE historico_atividades SET desfeita=true WHERE id=$1',[id])
      await cliente.query('COMMIT')
      return { mensagem:'Atividade desfeita.' }
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally { cliente.release() }
  },
  async listar() {
    const resultado = await pool.query('SELECT * FROM historico_atividades ORDER BY id DESC')
    return resultado.rows
  },
  async buscarPorId(id) {
    const resultado = await pool.query('SELECT * FROM historico_atividades WHERE id = $1', [id])
    return resultado.rows[0]
  },
  // O cliente permite salvar o histórico junto da movimentação na mesma transação.
  async criar(atividade, cliente = pool) {
    const resultado = await cliente.query(
      'INSERT INTO historico_atividades (tipo_acao, descricao, produtos_antes, movimentacoes_antes, criado_em, desfeita) VALUES ($1, $2, $3, $4, NOW(), false) RETURNING *',
      [atividade.tipo_acao, atividade.descricao, JSON.stringify(atividade.produtos_antes), JSON.stringify(atividade.movimentacoes_antes)]
    )
    return resultado.rows[0]
  }
}
export default historicoAtividadesRepository
