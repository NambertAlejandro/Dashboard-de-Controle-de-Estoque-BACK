import { pool } from "../database/connection.js"

const unidadesMedidaRepository = {
  async listar(usuarioId) {
    const resultado = await pool.query("SELECT * FROM unidades_medida WHERE usuario_id=$1 ORDER BY id",[usuarioId])
    return resultado.rows
  },

  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query("SELECT * FROM unidades_medida WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async criar(simbolo, usuarioId) {
    const resultado = await pool.query(
      "INSERT INTO unidades_medida (simbolo,usuario_id) VALUES ($1,$2) RETURNING *", [simbolo,usuarioId]
    )
    return resultado.rows[0]
  },

  async atualizar(id, simbolo, usuarioId) {
    const resultado = await pool.query(
      "UPDATE unidades_medida SET simbolo = $1 WHERE id = $2 AND usuario_id=$3 RETURNING *", [simbolo,id,usuarioId]
    )
    return resultado.rows[0]
  },

  async estaEmUso(id, usuarioId) {
    const resultado = await pool.query(
      "SELECT id FROM produtos WHERE unidade_medida_id = $1 AND usuario_id=$2 LIMIT 1", [id,usuarioId]
    )
    return resultado.rows.length > 0
  },

  async excluir(id, usuarioId) {
    // Evita deixar produtos apontando para uma unidade apagada.
    const resultado = await pool.query(
      `DELETE FROM unidades_medida WHERE id=$1 AND usuario_id=$2
       AND NOT EXISTS (SELECT 1 FROM produtos WHERE unidade_medida_id=$1 AND usuario_id=$2)
       RETURNING *`, [id,usuarioId]
    )
    return resultado.rows[0]
  },
}

export default unidadesMedidaRepository
