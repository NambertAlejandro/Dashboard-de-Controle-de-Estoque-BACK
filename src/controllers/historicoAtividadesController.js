import historicoAtividadesRepository from '../repositories/historicoAtividadesRepository.js'

function validarId(valor) {
  const id = Number(valor)
  if (!/^[0-9]+$/.test(String(valor)) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
    const erro = new Error('Informe um ID inteiro maior que zero.')
    erro.motivo = 'invalido'
    throw erro
  }
  return id
}

const historicoAtividadesController = {
  async desfazer(valor, usuarioId) {
    return await historicoAtividadesRepository.desfazer(validarId(valor),usuarioId)
  },
  async listar(usuarioId) {
    return await historicoAtividadesRepository.listar(usuarioId)
  },
  async buscarPorId(valor, usuarioId) {
    const atividade = await historicoAtividadesRepository.buscarPorId(validarId(valor),usuarioId)
    if (!atividade) {
      const erro = new Error('Atividade não encontrada.')
      erro.motivo = 'nao_encontrado'
      throw erro
    }
    return atividade
  }
}
export default historicoAtividadesController
