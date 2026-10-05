import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import { Usuario } from '../models/index.js'
import { texto, dinheiro, primeiroErro } from '../utils/validar.js'

function gerarToken(usuario) {
    return jwt.sign({ sub: usuario.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

//Remove a senha antes de devolver
function publico(usuario) {
    const { password, ...dados } = usuario.toJSON()
    return dados
}

//POST /auth/registrar
export async function registrar(req, res) {
    const { nome, email, username, password, salario = 0 } = req.body
    const erro = primeiroErro(
        texto(nome, 'Nome', 100),
        texto(email, 'E-mail', 100),
        /.+@.+\..+/.test(String(email ?? '')) ? null : 'E-mail inválido.',
        texto(username, 'Usuário', 100),
        String(password ?? '').length >= 6 ? null : 'A senha deve ter pelo menos 6 caracteres.',
        dinheiro(salario, 'Salário'),
    )
    if (erro) return res.status(400).json({ erro })

    const dados = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        salario: Number(salario),
    }

    const existe = await Usuario.findOne({ where: { [Op.or]: [{ email: dados.email }, { username: dados.username }] } })
    if (existe) {
        const campo = existe.email === dados.email ? 'e-mail' : 'usuário'
        return res.status(409).json({ erro: `Já existe uma conta com esse ${campo}.` })
    }

    const usuario = await Usuario.create({ ...dados, password: await bcrypt.hash(password, 10) })
    res.status(201).json({ token: gerarToken(usuario), usuario: publico(usuario) })
}

//POST /auth/login — aceita usuário ou e-mail
export async function login(req, res) {
    const login = String(req.body.login ?? '').trim().toLowerCase()
    const password = String(req.body.password ?? '')
    if (!login || !password) return res.status(400).json({ erro: 'Informe usuário e senha.' })

    const usuario = await Usuario.scope('comSenha').findOne({ where: { [Op.or]: [{ username: login }, { email: login }] } })
    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
        return res.status(401).json({ erro: 'Usuário ou senha incorretos.' })
    }

    res.json({ token: gerarToken(usuario), usuario: publico(usuario) })
}

//GET /auth/me
export async function me(req, res) {
    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado. Faça login novamente.' })
    res.json(usuario)
}

//PUT /auth/me — atualiza nome e salário base
export async function atualizarPerfil(req, res) {
    const usuario = await Usuario.findByPk(req.usuarioId)
    if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado. Faça login novamente.' })

    const { nome, salario } = req.body
    const erro = primeiroErro(texto(nome, 'Nome', 100), dinheiro(salario, 'Salário'))
    if (erro) return res.status(400).json({ erro })

    await usuario.update({ nome: nome.trim(), salario: Number(salario) })
    res.json(usuario)
}
