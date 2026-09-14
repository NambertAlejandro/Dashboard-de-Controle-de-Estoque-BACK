import { pool } from "../database/connection.js"

const categoriasRepository = {
  async listar(usuarioId) {
    const resultado = await pool.query("SELECT id, nome FROM categorias WHERE usuario_id=$1 ORDER BY id",[usuarioId])
    return resultado.rows
  },

  async buscarPorId(id, usuarioId) {
    const resultado = await pool.query("SELECT id, nome FROM categorias WHERE id = $1 AND usuario_id=$2", [id,usuarioId])
    return resultado.rows[0]
  },

  async criar(nome, usuarioId) {
    // $1 recebe o primeiro valor do array, sem concatenar texto no SQL.
    const resultado = await pool.query(
      "INSERT INTO categorias (nome,usuario_id) VALUES ($1,$2) RETURNING id, nome", [nome,usuarioId]
    )
    return resultado.rows[0]
  },

  async atualizar(id, nome, usuarioId) {
    const resultado = await pool.query(
      "UPDATE categorias SET nome = $1 WHERE id = $2 AND usuario_id=$3 RETURNING id, nome", [nome,id,usuarioId]
    )
    return resultado.rows[0]
  },

  async excluir(id, usuarioId) {
    // Também protege categorias em uso quando ainda não há chave estrangeira.
    const resultado = await pool.query(
      `DELETE FROM categorias
       WHERE id = $1 AND usuario_id=$2
       AND NOT EXISTS (SELECT 1 FROM produtos WHERE categoria_id = $1 AND usuario_id=$2)
       RETURNING id, nome`, [id,usuarioId]
    )
    return resultado.rows[0]
  },
}

export default categoriasRepository
