import usuariosController from '../controllers/usuariosController.js'

export default async function usuariosRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    try {
      const usuario = await usuariosController.entrar(request.body)
      const token = fastify.jwt.sign(
        { id: usuario.id, login: usuario.login },
        { expiresIn: '8h' }
      )
      return { token, usuario }
    } catch (erro) {
      if (erro.motivo === 'invalido') return reply.code(400).send({ erro: erro.message })
      if (erro.motivo === 'nao_autorizado') return reply.code(401).send({ erro: erro.message })
      request.log.error({ codigo: erro.code }, 'Falha ao realizar login')
      return reply.code(500).send({ erro: 'Não foi possível realizar o login.' })
    }
  })
}
