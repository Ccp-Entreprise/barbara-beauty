export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { password } = req.body || {};
  const adminPw = process.env.ADMIN_PASSWORD;

  if (!adminPw) {
    return res.status(500).json({
      success: false,
      error: 'ADMIN_PASSWORD non configuré côté serveur'
    });
  }

  if (!password || password !== adminPw) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
  }

  return res.status(200).json({ success: true, token: adminPw });
}
