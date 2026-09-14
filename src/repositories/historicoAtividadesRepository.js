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
  async registrar(cliente, ids, antes, tipo, descricao, usuarioId) {
    const depois = await historicoAtividadesRepository.capturar(cliente,ids)
    const categoriaIds = [...new Set(antes.produtos.map(produto => produto.categoria_id).filter(Boolean))]
    const unidadeIds = [...new Set(antes.produtos.map(produto => produto.unidade_medida_id).filter(Boolean))]
    const fornecedorIds = [...new Set(antes.lotes.map(lote => lote.fornecedor_id).filter(Boolean))]
    const localIds = [...new Set(antes.lotes.map(lote => lote.local_estoque_id).filter(Boolean))]
    const categorias = categoriaIds.length
      ? (await cliente.query('SELECT id, nome FROM categorias WHERE id = ANY($1::int[])',[categoriaIds])).rows
      : []
    const unidades = unidadeIds.length
      ? (await cliente.query('SELECT id, simbolo FROM unidades_medida WHERE id = ANY($1::int[])',[unidadeIds])).rows
      : []
    const fornecedores = fornecedorIds.length
      ? (await cliente.query('SELECT id, nome FROM fornecedores WHERE id = ANY($1::int[])',[fornecedorIds])).rows
      : []
    const locais = localIds.length
      ? (await cliente.query('SELECT id, nome FROM locais_estoque WHERE id = ANY($1::int[])',[localIds])).rows
      : []
    // As duas colunas JSON guardam o estado anterior; depois permite conferir mudanças.
    return await historicoAtividadesRepository.criar({
      tipo_acao:tipo, descricao,
      produtos_antes:{versao:1,ids,produtos:antes.produtos,lotes:antes.lotes,depois,referencias:{categorias,unidades,fornecedores,locais}},
      movimentacoes_antes:antes.movimentacoes
    },cliente,usuarioId)
  },
  async desfazer(id, usuarioId) {
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await historicoAtividadesRepository.bloquear(cliente)
      const atividade = (await cliente.query('SELECT * FROM historico_atividades WHERE id=$1 AND usuario_id=$2',[id,usuarioId])).rows[0]
      if (!atividade) {
        const erro = new Error('Atividade não encontrada.')
        erro.motivo = 'nao_encontrado'
        throw erro
      }
      const ultima = (await cliente.query('SELECT id FROM historico_atividades WHERE desfeita=false AND usuario_id=$1 ORDER BY id DESC LIMIT 1',[usuarioId])).rows[0]
      const dados = atividade.produtos_antes
      if (atividade.desfeita || ultima?.id !== id || dados?.versao !== 1) {
        const erro = new Error('Só é possível desfazer a atividade mais recente que possui cópia completa.')
        erro.motivo = 'conflito'
        throw erro
      }
      const atual = await historicoAtividadesRepository.capturar(cliente,dados.ids)
      // Históricos criados antes da separação por usuário não possuíam este campo.
      if (dados.depois?.produtos?.length && !('usuario_id' in dados.depois.produtos[0])) {
        atual.produtos = atual.produtos.map(({ usuario_id, ...produto }) => produto)
      }
      // Compara conteúdo, sem depender da ordem das chaves devolvidas pelo JSONB.
      const mesmo = (await cliente.query('SELECT $1::jsonb = $2::jsonb AS igual',[JSON.stringify(atual),JSON.stringify(dados.depois)])).rows[0].igual
      if (!mesmo) {
        const erro = new Error('Estes dados mudaram depois da atividade. Atualize o estoque antes de corrigir.')
        erro.motivo = 'conflito'
        throw erro
      }
      // Recria categorias e unidades removidas antes de restaurar o produto.
      for (const produto of dados.produtos) {
        const categoriaExiste = (await cliente.query('SELECT id FROM categorias WHERE id=$1',[produto.categoria_id])).rows[0]
        if (!categoriaExiste) {
          const salva = dados.referencias?.categorias?.find(item => item.id === produto.categoria_id)
          const nome = salva?.nome || `Categoria restaurada ${produto.categoria_id}`
          const criada = (await cliente.query(
            'INSERT INTO categorias (id,nome,usuario_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3) ON CONFLICT (usuario_id,nome) DO NOTHING RETURNING id',
            [produto.categoria_id,nome,usuarioId]
          )).rows[0]
          if (!criada) produto.categoria_id = (await cliente.query('SELECT id FROM categorias WHERE nome=$1 AND usuario_id=$2',[nome,usuarioId])).rows[0].id
        }

        const unidadeExiste = (await cliente.query('SELECT id FROM unidades_medida WHERE id=$1',[produto.unidade_medida_id])).rows[0]
        if (!unidadeExiste) {
          const salva = dados.referencias?.unidades?.find(item => item.id === produto.unidade_medida_id)
          const simbolo = salva?.simbolo || `rest-${produto.unidade_medida_id}`
          const criada = (await cliente.query(
            'INSERT INTO unidades_medida (id,simbolo,usuario_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3) ON CONFLICT (usuario_id,simbolo) DO NOTHING RETURNING id',
            [produto.unidade_medida_id,simbolo,usuarioId]
          )).rows[0]
          if (!criada) produto.unidade_medida_id = (await cliente.query('SELECT id FROM unidades_medida WHERE simbolo=$1 AND usuario_id=$2',[simbolo,usuarioId])).rows[0].id
        }
      }
      for (const lote of dados.lotes) {
        if (lote.fornecedor_id && !(await cliente.query('SELECT id FROM fornecedores WHERE id=$1',[lote.fornecedor_id])).rows[0]) {
          const salva = dados.referencias?.fornecedores?.find(item => item.id === lote.fornecedor_id)
          const nome = salva?.nome || `Fornecedor restaurado ${lote.fornecedor_id}`
          const criada = (await cliente.query(
            'INSERT INTO fornecedores (id,nome,usuario_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3) ON CONFLICT (usuario_id,nome) DO NOTHING RETURNING id',
            [lote.fornecedor_id,nome,usuarioId]
          )).rows[0]
          if (!criada) lote.fornecedor_id = (await cliente.query('SELECT id FROM fornecedores WHERE nome=$1 AND usuario_id=$2',[nome,usuarioId])).rows[0].id
        }
        if (lote.local_estoque_id && !(await cliente.query('SELECT id FROM locais_estoque WHERE id=$1',[lote.local_estoque_id])).rows[0]) {
          const salvo = dados.referencias?.locais?.find(item => item.id === lote.local_estoque_id)
          const nome = salvo?.nome || `Local restaurado ${lote.local_estoque_id}`
          const criado = (await cliente.query(
            'INSERT INTO locais_estoque (id,nome,usuario_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3) ON CONFLICT (usuario_id,nome) DO NOTHING RETURNING id',
            [lote.local_estoque_id,nome,usuarioId]
          )).rows[0]
          if (!criado) lote.local_estoque_id = (await cliente.query('SELECT id FROM locais_estoque WHERE nome=$1 AND usuario_id=$2',[nome,usuarioId])).rows[0].id
        }
      }
      // Primeiro retira os registros dependentes, depois restaura com os mesmos IDs.
      await cliente.query('DELETE FROM movimentacoes_estoque WHERE produto_id=ANY($1::int[])',[dados.ids])
      await cliente.query('DELETE FROM lotes WHERE produto_id=ANY($1::int[])',[dados.ids])
      await cliente.query('DELETE FROM produtos WHERE id=ANY($1::int[])',[dados.ids])
      // OVERRIDING SYSTEM VALUE permite recuperar o ID antigo de uma coluna identity.
      for (const produto of dados.produtos) {
        await cliente.query('INSERT INTO produtos (id,name,sku,"itemType","unitPrice","minStock",categoria_id,unidade_medida_id,notes,usuario_id) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[produto.id,produto.name,produto.sku,produto.itemType,produto.unitPrice,produto.minStock,produto.categoria_id,produto.unidade_medida_id,produto.notes,usuarioId])
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
  async listar(usuarioId) {
    const resultado = await pool.query('SELECT * FROM historico_atividades WHERE usuario_id=$1 ORDER BY id DESC',[usuarioId])
    return resultado.rows
  },
  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query('SELECT * FROM historico_atividades WHERE id=$1 AND usuario_id=$2',[id,usuarioId])
    return resultado.rows[0]
  },
  // O cliente permite salvar o histórico junto da movimentação na mesma transação.
  async criar(atividade, cliente = pool, usuarioId) {
    const resultado = await cliente.query(
      'INSERT INTO historico_atividades (tipo_acao, descricao, produtos_antes, movimentacoes_antes, criado_em, desfeita, usuario_id) VALUES ($1,$2,$3,$4,NOW(),false,$5) RETURNING *',
      [atividade.tipo_acao,atividade.descricao,JSON.stringify(atividade.produtos_antes),JSON.stringify(atividade.movimentacoes_antes),usuarioId]
    )
    return resultado.rows[0]
  }
}
export default historicoAtividadesRepository
