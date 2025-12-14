const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO DE SEGURANÇA ====================
app.use(cors({
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// ==================== CONFIGURAÇÃO DOS PROVEDORES REAIS ====================
const PROVIDERS_CONFIG = {
    // PROVEDOR 1 - Caderno Online (SEU LINK QUE FUNCIONA NO VUPLAYER)
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php',
        params: {
            username: 'Douglasr',
            password: '478356523',
            type: 'm3u_plus',
            output: 'mpegts'
        }
    },
    // PROVEDOR 2 - Adicione seu segundo provedor AQUI
    'provider2': {
        name: 'Provedor Secundário',
        url: 'http://SEU-SEGUNDO-PROVEDOR.com/api.php',
        params: {
            user: 'SEU_USUARIO',
            pass: 'SUA_SENHA',
            type: 'm3u'
        }
    }
};

// ==================== FUNÇÕES AUXILIARES ====================
async function fetchPlaylist(url) {
    console.log('🔗 Buscando playlist:', url);
    
    try {
        // Usando proxy CORS para contornar bloqueios
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl, {
            headers: {
                'User-Agent': 'VISIONSTREAM-PRO/2.0',
                'Accept': 'audio/x-mpegurl, text/plain'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Proxy status: ${response.status}`);
        }
        
        const text = await response.text();
        
        if (!text || text.trim() === '') {
            throw new Error('Playlist vazia recebida');
        }
        
        console.log('✅ Playlist obtida:', text.length, 'bytes');
        return {
            success: true,
            data: text,
            contentType: 'audio/x-mpegurl'
        };
        
    } catch (error) {
        console.error('❌ Erro ao buscar playlist:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey) {
        console.error('❌ ERRO: API_KEY não configurada');
        return res.status(500).send('#EXTM3U\n# Erro: Servidor mal configurado');
    }
    
    if (!apiKey) {
        return res.status(401).send('#EXTM3U\n# Erro: Chave de API não fornecida');
    }
    
    if (apiKey !== validApiKey) {
        console.warn(`⚠️ Tentativa de acesso com chave inválida`);
        return res.status(403).send('#EXTM3U\n# Erro: Chave de API inválida');
    }
    
    next();
};

// ==================== ROTAS DA API ====================
app.get('/api/playlist', validateApiKey, async (req, res) => {
    try {
        const { provider = 'provider1' } = req.query;
        const providerConfig = PROVIDERS_CONFIG[provider];
        
        if (!providerConfig) {
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não existe');
        }
        
        console.log(`📡 Buscando playlist do provedor: ${providerConfig.name}`);
        
        // Construir URL do provedor
        const url = new URL(providerConfig.url);
        Object.entries(providerConfig.params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        
        const providerUrl = url.toString();
        const result = await fetchPlaylist(providerUrl);
        
        if (!result.success) {
            return res.status(502).send(`#EXTM3U\n# Erro: ${result.error}`);
        }
        
        // Adicionar cabeçalho informativo
        const enhancedPlaylist = `#EXTM3U\n# VisionStream PRO - ${providerConfig.name}\n# Data: ${new Date().toISOString()}\n${result.data}`;
        
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Cache-Control', 'public, max-age=300');
        
        console.log(`✅ Playlist entregue do provedor: ${providerConfig.name}`);
        res.send(enhancedPlaylist);
        
    } catch (error) {
        console.error('💥 Erro inesperado:', error);
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VisionStream Proxy',
        version: '1.0',
        timestamp: new Date().toISOString()
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║     VISIONSTREAM PRO PROXY v1.0          ║
    ║     🚀 Servidor iniciado com sucesso!    ║
    ╠═══════════════════════════════════════════╣
    ║ Porta: ${PORT}                                ║
    ║ Provedores: ${Object.keys(PROVIDERS_CONFIG).length} configurados          ║
    ╚═══════════════════════════════════════════╝
    `);
});
