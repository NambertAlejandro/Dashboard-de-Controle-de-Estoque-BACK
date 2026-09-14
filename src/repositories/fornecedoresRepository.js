import { pool } from "../database/connection.js"

const fornecedoresRepository = {
  async listar() {
    const resultado = await pool.query("SELECT id, nome FROM fornecedores ORDER BY id")
    return resultado.rows
  },

  async buscarPorId(id) {
    const resultado = await pool.query("SELECT id, nome FROM fornecedores WHERE id = $1", [id])
    return resultado.rows[0]
  },

  async criar(nome) {
    // $1 recebe o primeiro valor do array, sem concatenar texto no SQL.
    const resultado = await pool.query(
      "INSERT INTO fornecedores (nome) VALUES ($1) RETURNING id, nome", [nome]
    )
    return resultado.rows[0]
  },

  async atualizar(id, nome) {
    const resultado = await pool.query(
      "UPDATE fornecedores SET nome = $1 WHERE id = $2 RETURNING id, nome", [nome, id]
    )
    return resultado.rows[0]
  },

  async excluir(id) {
    // Também protege fornecedores em uso quando ainda não há chave estrangeira.
    const resultado = await pool.query(
      `DELETE FROM fornecedores
       WHERE id = $1
       AND NOT EXISTS (SELECT 1 FROM lotes WHERE fornecedor_id = $1)
       RETURNING id, nome`, [id]
    )
    return resultado.rows[0]
  },
}

export default fornecedoresRepository
