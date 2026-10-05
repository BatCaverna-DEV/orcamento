import jwt from 'jsonwebtoken'

//Exige "Authorization: Bearer <token>" e coloca o id do usuário em req.usuarioId
export default function autenticar(req, res, next) {
    const [tipo, token] = (req.headers.authorization || '').split(' ')
    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'Faça login para continuar.' })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.usuarioId = payload.sub
        next()
    } catch {
        res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' })
    }
}
