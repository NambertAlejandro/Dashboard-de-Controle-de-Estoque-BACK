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
  },

  async criar(dados) {
    const login = typeof dados?.login === 'string' ? dados.login.trim() : ''
    const senha = typeof dados?.senha === 'string' ? dados.senha : ''

    if (login.length < 3) {
      const erro = new Error('O login precisa ter pelo menos 3 caracteres.')
      erro.motivo = 'invalido'
      throw erro
    }
    if (senha.length < 6) {
      const erro = new Error('A senha precisa ter pelo menos 6 caracteres.')
      erro.motivo = 'invalido'
      throw erro
    }

    const senhaHash = await bcrypt.hash(senha, 12)
    return await usuariosRepository.criar(login, senhaHash)
  },

  async trocarSenha(usuarioId, dados) {
    const senhaAtual = typeof dados?.senhaAtual === 'string' ? dados.senhaAtual : ''
    const novaSenha = typeof dados?.novaSenha === 'string' ? dados.novaSenha : ''

    if (novaSenha.length < 6) {
      const erro = new Error('A nova senha precisa ter pelo menos 6 caracteres.')
      erro.motivo = 'invalido'
      throw erro
    }

    const usuario = await usuariosRepository.buscarPorId(usuarioId)
    const senhaCorreta = usuario && await bcrypt.compare(senhaAtual, usuario.senha_hash)
    if (!senhaCorreta) {
      const erro = new Error('A senha atual está incorreta.')
      erro.motivo = 'invalido'
      throw erro
    }
    if (await bcrypt.compare(novaSenha, usuario.senha_hash)) {
      const erro = new Error('Escolha uma senha diferente da atual.')
      erro.motivo = 'invalido'
      throw erro
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12)
    return await usuariosRepository.trocarSenha(usuarioId, senhaHash)
  }
}

export default usuariosController
