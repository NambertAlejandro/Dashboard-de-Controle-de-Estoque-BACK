import bcrypt from 'bcryptjs'
import usuariosRepository from '../repositories/usuariosRepository.js'

const usuariosController = {
  async entrar(dados) {
    if (typeof dados?.login !== 'string' || typeof dados?.senha !== 'string') {
      const erro = new Error('Informe o login e a senha.')
      erro.motivo = 'invalido'
      throw erro
    }

    const usuario = await usuariosRepository.buscarPorLogin(dados.login.trim())
    const senhaCorreta = usuario && await bcrypt.compare(dados.senha, usuario.senha_hash)

    if (!senhaCorreta) {
      const erro = new Error('Login ou senha incorretos.')
      erro.motivo = 'nao_autorizado'
      throw erro
    }

    return { id: usuario.id, login: usuario.login }
  }
}

export default usuariosController
