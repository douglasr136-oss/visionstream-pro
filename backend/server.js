const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configurações de segurança
app.use(cors({
  origin: ['https://seusite-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Chave de API para segurança (configure no Render Dashboard)
const API_KEY = process.env.API_KEY || 'SUA_CHAVE_SECRETA_AQUI';

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const clientKey = req.query.api_key || req.headers['x-api-key'];
  
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(403).json({ 
      error: 'Acesso não autorizado. API Key inválida.' 
    });
  }
  next();
};

// Rota principal do proxy
app.get('/api/playlist', authenticate, async (req, res) => {
  try {
    const { provider } = req.query;
    
    // Mapeamento dos seus provedores
    const providers = {
      'provider1': 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts',
      'provider2': 'http://outroprovedor.com/api.php?user=cliente&pass=senha&type=m3u'
    };

    const playlistUrl = providers[provider];
    
    if (!playlistUrl) {
      return res.status(400).json({ error: 'Provedor não encontrado' });
    }

    // Buscar a playlist do provedor
    const response = await fetch(playlistUrl, {
      headers: {
        'User-Agent': 'VISIONSTREAM-PRO/2.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Provedor respondeu com status: ${response.status}`);
    }

    const playlistText = await response.text();
    
    // Retornar como M3U
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.send(playlistText);

  } catch (error) {
    console.error('Erro no proxy:', error);
    res.status(502).send('#EXTM3U\n# Erro ao carregar playlist do provedor.');
  }
});

// Rota de saúde para verificar se o backend está online
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'VisionStream Proxy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`✅ Proxy backend rodando na porta ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
