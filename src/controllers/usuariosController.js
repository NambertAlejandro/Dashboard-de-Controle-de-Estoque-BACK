import bcrypt from 'bcryptjs'
import usuariosRepository from '../repositories/usuariosRepository.js'
import { enviarCodigo } from '../services/emailService.js'

function validarEmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email)
}

function validarSenha(senha) {
  return senha.length >= 6 && /\d/.test(senha)
}

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

    if (!validarEmail(login)) {
      const erro = new Error('Informe um endereço válido do Gmail.')
      erro.motivo = 'invalido'
      throw erro
    }
    if (!validarSenha(senha)) {
      const erro = new Error('A senha precisa ter pelo menos 6 caracteres e um número.')
      erro.motivo = 'invalido'
      throw erro
    }

    const senhaHash = await bcrypt.hash(senha, 12)
    return await usuariosRepository.criar(login.toLowerCase(), senhaHash)
  },

  async trocarSenha(usuarioId, dados) {
    const senhaAtual = typeof dados?.senhaAtual === 'string' ? dados.senhaAtual : ''
    const novaSenha = typeof dados?.novaSenha === 'string' ? dados.novaSenha : ''

    if (!validarSenha(novaSenha)) {
      const erro = new Error('A nova senha precisa ter pelo menos 6 caracteres e um número.')
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
  },

  async solicitarCodigo(dados) {
    const email = typeof dados?.email === 'string' ? dados.email.trim() : ''
    if (!validarEmail(email)) {
      const erro = new Error('Informe um endereço válido do Gmail.')
      erro.motivo = 'invalido'
      throw erro
    }

    const usuario = await usuariosRepository.buscarPorLogin(email)
    if (!usuario) return

    const codigo = String(Math.floor(100000 + Math.random() * 900000))
    const codigoHash = await bcrypt.hash(codigo, 10)
    const expira = new Date(Date.now() + 10 * 60 * 1000)
    await usuariosRepository.salvarCodigo(usuario.id, codigoHash, expira)
    await enviarCodigo(usuario.login, codigo)
  },

  async redefinirSenha(dados) {
    const email = typeof dados?.email === 'string' ? dados.email.trim() : ''
    const codigo = typeof dados?.codigo === 'string' ? dados.codigo.trim() : ''
    const novaSenha = typeof dados?.novaSenha === 'string' ? dados.novaSenha : ''
    const usuario = await usuariosRepository.buscarPorLogin(email)

    if (!validarSenha(novaSenha)) {
      const erro = new Error('A nova senha precisa ter pelo menos 6 caracteres e um número.')
      erro.motivo = 'invalido'
      throw erro
    }
    const valido = usuario?.codigo_recuperacao_hash &&
      new Date(usuario.codigo_recuperacao_expira) > new Date() &&
      await bcrypt.compare(codigo, usuario.codigo_recuperacao_hash)
    if (!valido) {
      const erro = new Error('Código inválido ou vencido.')
      erro.motivo = 'invalido'
      throw erro
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12)
    await usuariosRepository.redefinirSenha(usuario.id, senhaHash)
  }
}

export default usuariosController
