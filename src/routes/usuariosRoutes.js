import usuariosController from '../controllers/usuariosController.js'

export default async function usuariosRoutes(fastify) {
  const responderErro = (erro, request, reply, mensagem) => {
    if (erro.motivo === 'invalido') return reply.code(400).send({ erro: erro.message })
    if (erro.motivo === 'nao_autorizado') return reply.code(401).send({ erro: erro.message })
    if (erro.code === '23505') return reply.code(409).send({ erro: 'Este login já está sendo usado.' })
    request.log.error({ codigo: erro.code }, mensagem)
    return reply.code(500).send({ erro: 'Não foi possível concluir a operação.' })
  }

  fastify.post('/login', async (request, reply) => {
    try {
      const usuario = await usuariosController.entrar(request.body)
      const token = fastify.jwt.sign(
        { id: usuario.id, login: usuario.login },
        { expiresIn: '8h' }
      )
      return { token, usuario }
    } catch (erro) {
      return responderErro(erro, request, reply, 'Falha ao realizar login')
    }
  })

  fastify.post('/criar-conta', async (request, reply) => {
    try {
      const usuario = await usuariosController.criar(request.body)
      const token = fastify.jwt.sign(
        { id: usuario.id, login: usuario.login },
        { expiresIn: '8h' }
      )
      return reply.code(201).send({ token, usuario })
    } catch (erro) {
      return responderErro(erro, request, reply, 'Falha ao criar conta')
    }
  })

  fastify.put('/trocar-senha', async (request, reply) => {
    try {
      await usuariosController.trocarSenha(request.user.id, request.body)
      return { mensagem: 'Senha alterada com sucesso.' }
    } catch (erro) {
      return responderErro(erro, request, reply, 'Falha ao trocar senha')
    }
  })
}
