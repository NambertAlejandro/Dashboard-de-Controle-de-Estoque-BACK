import { pool } from '../database/connection.js'

const usuariosRepository = {
  async buscarPorLogin(login) {
    const resultado = await pool.query(
      'SELECT id, login, senha_hash FROM usuarios WHERE LOWER(login) = LOWER($1)',
      [login]
    )
    return resultado.rows[0]
  },

  async buscarPorId(id) {
    const resultado = await pool.query(
      'SELECT id, login, senha_hash FROM usuarios WHERE id = $1',
      [id]
    )
    return resultado.rows[0]
  },

  async criar(login, senhaHash) {
    const resultado = await pool.query(
      'INSERT INTO usuarios (login, senha_hash) VALUES ($1, $2) RETURNING id, login',
      [login, senhaHash]
    )
    return resultado.rows[0]
  },

  async trocarSenha(id, senhaHash) {
    const resultado = await pool.query(
      'UPDATE usuarios SET senha_hash = $1 WHERE id = $2 RETURNING id, login',
      [senhaHash, id]
    )
    return resultado.rows[0]
  }
}

export default usuariosRepository
