import { pool } from '../database/connection.js'

const usuariosRepository = {
  async buscarPorLogin(login) {
    const resultado = await pool.query(
      'SELECT id, login, senha_hash FROM usuarios WHERE login = $1',
      [login]
    )
    return resultado.rows[0]
  }
}

export default usuariosRepository
