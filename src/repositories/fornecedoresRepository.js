import { pool } from "../database/connection.js"

const fornecedoresRepository = {
  async listar(usuarioId) {
    const resultado = await pool.query("SELECT id, nome FROM fornecedores WHERE usuario_id=$1 ORDER BY id",[usuarioId])
    return resultado.rows
  },

  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query("SELECT id, nome FROM fornecedores WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async criar(nome, usuarioId) {
    // $1 recebe o primeiro valor do array, sem concatenar texto no SQL.
    const resultado = await pool.query(
      "INSERT INTO fornecedores (nome,usuario_id) VALUES ($1,$2) RETURNING id, nome", [nome,usuarioId]
    )
    return resultado.rows[0]
  },

  async atualizar(id, nome, usuarioId) {
    const resultado = await pool.query(
      "UPDATE fornecedores SET nome = $1 WHERE id = $2 AND usuario_id=$3 RETURNING id, nome", [nome,id,usuarioId]
    )
    return resultado.rows[0]
  },

  async excluir(id, usuarioId) {
    // Também protege fornecedores em uso quando ainda não há chave estrangeira.
    const resultado = await pool.query(
      `DELETE FROM fornecedores
       WHERE id = $1 AND usuario_id=$2
       AND NOT EXISTS (SELECT 1 FROM lotes WHERE fornecedor_id = $1)
       RETURNING id, nome`, [id,usuarioId]
    )
    return resultado.rows[0]
  },
}

export default fornecedoresRepository
