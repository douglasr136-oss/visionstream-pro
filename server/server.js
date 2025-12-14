// server.js - VISIONSTREAM PRO (CORS FIXED)
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO CORS COMPLETA ====================
app.use(cors({
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000', 'http://localhost:5500', 'https://visionstream-pro.onrender.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Client-Version', 'Accept'],
    exposedHeaders: ['Content-Type', 'X-Total-Count'],
    maxAge: 86400 // 24 horas
}));

// Headers CORS manuais para garantir
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Expose-Headers', 'Content-Type, Content-Length, X-Total-Count');
    
    // Para requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// ==================== PROVEDORES ====================
const PROVIDERS = {
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts'
    }
};

// ==================== FUNÇÃO PARA BUSCAR M3U ====================
async function fetchM3U(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const protocol = isHttps ? https : http;
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            timeout: 30000
        };
        
        const req = protocol.request(options, (res) => {
            let data = '';
            
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout após 30 segundos'));
        });
        
        req.end();
    });
}

// ==================== ROTAS ====================

// 1. Rota de saúde (sem validação)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        providers: Object.keys(PROVIDERS).length
    });
});

// 2. Rota principal (COM CORS HEADERS EXPLÍCITOS)
app.get('/api/playlist', async (req, res) => {
    console.log('📥 Requisição recebida para /api/playlist');
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    try {
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Conectando a: ${provider.name}`);
        console.log(`🔗 URL: ${provider.url}`);
        
        // Buscar playlist do provedor
        let m3uData;
        try {
            m3uData = await fetchM3U(provider.url);
            console.log(`✅ Resposta recebida: ${m3uData.data.length} bytes`);
        } catch (fetchError) {
            console.error('❌ Erro ao buscar do provedor:', fetchError.message);
            
            // Fallback: retornar playlist de teste
            const testPlaylist = `#EXTM3U
# Playlist de Teste - VisionStream PRO
# Provedor: ${provider.name}
# Data: ${new Date().toLocaleString('pt-BR')}

#EXTINF:-1 tvg-id="globo.br" tvg-name="GLOBO HD" tvg-logo="https://i.imgur.com/globo.png" group-title="Abertos",GLOBO HD
http://example.com/globo.m3u8

#EXTINF:-1 tvg-id="sbt.br" tvg-name="SBT HD" tvg-logo="https://i.imgur.com/sbt.png" group-title="Abertos",SBT HD
http://example.com/sbt.m3u8

#EXTINF:-1 tvg-id="record.br" tvg-name="RECORD HD" tvg-logo="https://i.imgur.com/record.png" group-title="Abertos",RECORD HD
http://example.com/record.m3u8

#EXTINF:-1 tvg-id="band.br" tvg-name="BAND HD" tvg-logo="https://i.imgur.com/band.png" group-title="Abertos",BAND HD
http://example.com/band.m3u8

#EXTINF:-1 tvg-id="hbo.br" tvg-name="HBO HD" tvg-logo="https://i.imgur.com/hbo.png" group-title="Filmes",HBO HD
http://example.com/hbo.m3u8

#EXTINF:-1 tvg-id="fox.br" tvg-name="FOX HD" tvg-logo="https://i.imgur.com/fox.png" group-title="Filmes",FOX HD
http://example.com/fox.m3u8

#EXTINF:-1 tvg-id="espn.br" tvg-name="ESPN HD" tvg-logo="https://i.imgur.com/espn.png" group-title="Esportes",ESPN HD
http://example.com/espn.m3u8

# Canais: 7
# Gerado por VisionStream PRO`;
            
            m3uData = { success: true, data: testPlaylist };
        }
        
        // Contar canais
        const channelCount = (m3uData.data.match(/#EXTINF:/g) || []).length;
        
        // Adicionar cabeçalho personalizado
        const enhancedPlaylist = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
${m3uData.data}`;
        
        // HEADERS CORS CRUCIAIS
        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-VisionStream-Channels', channelCount);
        res.setHeader('X-VisionStream-Provider', provider.name);
        
        console.log(`📤 Enviando resposta: ${channelCount} canais`);
        res.send(enhancedPlaylist);
        
    } catch (error) {
        console.error('💥 Erro no servidor:', error);
        
        // Mesmo em erro, enviar headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'text/plain');
        
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// 3. Rota de teste (SEMPRE FUNCIONA)
app.get('/api/test', (req, res) => {
    console.log('✅ Rota de teste acessada');
    
    const testM3U = `#EXTM3U
#EXTINF:-1,Teste 1 - VisionStream PRO
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1,Teste 2 - Stream Público
https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8

# Rota de teste funcionando!`;
    
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(testM3U);
});

// 4. Rota para listar provedores
app.get('/api/providers', (req, res) => {
    const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
        id,
        name: config.name,
        url: config.url.replace(/password=[^&]*/, 'password=***')
    }));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        success: true,
        count: providers.length,
        providers: providers
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║          VISIONSTREAM PRO - BACKEND FIXED        ║
    ╠═══════════════════════════════════════════════════╣
    ║   🚀 Servidor rodando na porta ${PORT}           ║
    ║   🔧 CORS CONFIGURADO CORRETAMENTE               ║
    ║   📡 Endpoints:                                  ║
    ║      • /health                                   ║
    ║      • /api/playlist?provider=provider1          ║
    ║      • /api/test                                 ║
    ║      • /api/providers                            ║
    ║   🌐 Frontend: visionstream-app.onrender.com     ║
    ╚═══════════════════════════════════════════════════╝
    `);
    
    console.log('✅ Servidor pronto para receber requisições!');
});
