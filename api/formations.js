import { put, list } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BLOB_KEY = 'formations.json';

async function getFallback() {
  const filePath = join(process.cwd(), 'formations.json');
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function getFormations() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    const blob = blobs.find(b => b.pathname === BLOB_KEY);
    if (blob) {
      const res = await fetch(blob.url + '?t=' + Date.now());
      if (res.ok) return await res.json();
    }
  } catch (e) {
    console.error('Blob read error:', e);
  }
  return await getFallback();
}

async function saveFormations(data) {
  return await put(BLOB_KEY, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });
}

function checkAuth(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const adminPw = process.env.ADMIN_PASSWORD;
  return !!(token && adminPw && token === adminPw);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const data = await getFormations();
      return res.status(200).json(data);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    try {
      const data = req.body;
      if (!data || !Array.isArray(data.formations)) {
        return res.status(400).json({ error: 'Structure de données invalide' });
      }
      await saveFormations(data);
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error('Save error:', e);
      return res.status(500).json({ error: 'Sauvegarde échouée', detail: String(e.message || e) });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
