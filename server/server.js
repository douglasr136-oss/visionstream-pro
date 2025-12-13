// server.js - Proxy Seguro para VISIONSTREAM PRO
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO DE SEGURANÇA ====================
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitado para compatibilidade com players
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: [
        'https://visionstream-app.onrender.com',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    credentials: true,
    maxAge: 86400
}));
app.use(express.json());

// ==================== CONFIGURAÇÃO DOS PROVEDORES ====================
// SUAS CREDENCIAIS FICAM AQUI - NUNCA NO FRONTEND!
const PROVIDERS_CONFIG = {
    // PROVEDOR 1 - Caderno Online
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
    // PROVEDOR 2 - Adicione outros provedores aqui
    'provider2': {
        name: 'Provedor Secundário',
        url: 'http://outroprovedor.com/api.php',
        params: {
            user: 'cliente',
            pass: 'senha',
            type: 'm3u'
        }
    }
    // Adicione mais provedores conforme necessário
};

// ==================== FUNÇÕES AUXILIARES ====================
function buildProviderUrl(providerConfig) {
    const url = new URL(providerConfig.url);
    Object.entries(providerConfig.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });
    return url.toString();
}

async function fetchPlaylist(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
    
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (VISIONSTREAM-PRO/2.0)',
                'Accept': 'audio/x-mpegurl, application/x-mpegurl, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate'
            },
            compress: true,
            redirect: 'follow'
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        // Validação básica do conteúdo
        if (!text || text.trim().length === 0) {
            throw new Error('Playlist vazia recebida do provedor');
        }
        
        return {
            success: true,
            data: text,
            contentType: contentType.includes('mpegurl') ? 'audio/x-mpegurl' : 'text/plain'
        };
        
    } catch (error) {
        clearTimeout(timeout);
        return {
            success: false,
            error: error.name === 'AbortError' ? 'Timeout: O provedor demorou muito para responder' : error.message
        };
    }
}

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey) {
        console.error('❌ ERRO CRÍTICO: API_KEY não configurada no ambiente');
        return res.status(500).send('#EXTM3U\n# Erro: Servidor mal configurado');
    }
    
    if (!apiKey) {
        return res.status(401).send('#EXTM3U\n# Erro: Chave de API não fornecida');
    }
    
    if (apiKey !== validApiKey) {
        console.warn(`⚠️ Tentativa de acesso com chave inválida: ${apiKey.substring(0, 10)}...`);
        return res.status(403).send('#EXTM3U\n# Erro: Chave de API inválida');
    }
    
    next();
};

// ==================== ROTAS DA API ====================

// Rota principal: /api/playlist
app.get('/api/playlist', validateApiKey, async (req, res) => {
    try {
        const { provider = 'provider1' } = req.query;
        const providerConfig = PROVIDERS_CONFIG[provider];
        
        if (!providerConfig) {
            return res.status(400).send('#EXTM3U\n# Erro: Provedor especificado não existe');
        }
        
        console.log(`📡 Buscando playlist do provedor: ${providerConfig.name}`);
        
        const providerUrl = buildProviderUrl(providerConfig);
        const result = await fetchPlaylist(providerUrl);
        
        if (!result.success) {
            console.error(`❌ Falha ao buscar do provedor ${provider}:`, result.error);
            return res.status(502).send(`#EXTM3U\n# Erro: Falha ao conectar com o provedor\n# Detalhes: ${result.error}`);
        }
        
        // Adicionar cabeçalho informativo
        const enhancedPlaylist = `#EXTM3U\n# Playlist processada por VISIONSTREAM PRO\n# Provedor: ${providerConfig.name}\n# Data: ${new Date().toISOString()}\n${result.data}`;
        
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('X-Provider', providerConfig.name);
        res.setHeader('X-Processed-By', 'VISIONSTREAM-PRO/2.0');
        res.setHeader('Cache-Control', 'public, max-age=300'); // Cache de 5 minutos
        
        console.log(`✅ Playlist entregue com sucesso: ${enhancedPlaylist.length} bytes`);
        res.send(enhancedPlaylist);
        
    } catch (error) {
        console.error('💥 Erro inesperado no proxy:', error);
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// Rota de informações: /api/providers
app.get('/api/providers', validateApiKey, (req, res) => {
    const providersList = Object.entries(PROVIDERS_CONFIG).map(([id, config]) => ({
        id,
        name: config.name,
        available: true
    }));
    
    res.json({
        success: true,
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0',
        timestamp: new Date().toISOString(),
        providers: providersList
    });
});

// Rota de saúde: /health
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        providers: Object.keys(PROVIDERS_CONFIG).length
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'Bem-vindo ao VISIONSTREAM PRO Proxy API',
        version: '2.0',
        endpoints: {
            playlist: '/api/playlist?provider=provider1',
            providers: '/api/providers',
            health: '/health'
        },
        documentation: 'Esta API é usada exclusivamente pelo VISIONSTREAM PRO Player'
    });
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║     VISIONSTREAM PRO PROXY v2.0          ║
    ║     🚀 Servidor iniciado com sucesso!    ║
    ╠═══════════════════════════════════════════╣
    ║ Porta: ${PORT}                                ║
    ║ Modo: ${process.env.NODE_ENV || 'development'}                 ║
    ║ Provedores: ${Object.keys(PROVIDERS_CONFIG).length} configurados          ║
    ║ Health Check: http://localhost:${PORT}/health  ║
    ╚═══════════════════════════════════════════╝
    `);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Rejeição não tratada em:', promise, 'motivo:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Exceção não capturada:', error);
    process.exit(1);
});
