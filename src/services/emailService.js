import nodemailer from 'nodemailer'

export async function enviarCodigo(email, codigo) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Configure GMAIL_USER e GMAIL_APP_PASSWORD no Render.')
  }

  const transportador = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  })

  await transportador.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Código para trocar sua senha',
    text: `Seu código de confirmação é: ${codigo}\n\nEle vale por 10 minutos.`
  })
}
