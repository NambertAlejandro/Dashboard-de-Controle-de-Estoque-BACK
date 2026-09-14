import { pool } from "../database/connection.js"

const unidadesMedidaRepository = {
  async listar() {
    const resultado = await pool.query("SELECT * FROM unidades_medida ORDER BY id")
    return resultado.rows
  },

  async buscarPorId(id) {
    const resultado = await pool.query("SELECT * FROM unidades_medida WHERE id = $1", [id])
    return resultado.rows[0]
  },

  async criar(simbolo) {
    const resultado = await pool.query(
      "INSERT INTO unidades_medida (simbolo) VALUES ($1) RETURNING *", [simbolo]
    )
    return resultado.rows[0]
  },

  async atualizar(id, simbolo) {
    const resultado = await pool.query(
      "UPDATE unidades_medida SET simbolo = $1 WHERE id = $2 RETURNING *", [simbolo, id]
    )
    return resultado.rows[0]
  },

  async estaEmUso(id) {
    const resultado = await pool.query(
      "SELECT id FROM produtos WHERE unidade_medida_id = $1 LIMIT 1", [id]
    )
    return resultado.rows.length > 0
  },

  async excluir(id) {
    // Evita deixar produtos apontando para uma unidade apagada.
    const resultado = await pool.query(
      `DELETE FROM unidades_medida WHERE id = $1
       AND NOT EXISTS (SELECT 1 FROM produtos WHERE unidade_medida_id = $1)
       RETURNING *`, [id]
    )
    return resultado.rows[0]
  },
}

export default unidadesMedidaRepository
