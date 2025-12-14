// server.js - VISIONSTREAM PRO (CONEXÃO DIRETA COMO VUPLAYER)
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO ====================
app.use(cors({
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// ==================== SEUS PROVEDORES REAIS ====================
const PROVIDERS = {
    // PROVEDOR 1 - Caderno Online (SEU LINK ORIGINAL)
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts',
        method: 'GET'
    },
    
    // PROVEDOR 2 - Adicione outros aqui
    'provider2': {
        name: 'Provedor Secundário', 
        url: 'http://outroprovedor.com/api.php?user=cliente&pass=senha&type=m3u',
        method: 'GET'
    }
};

// ==================== FUNÇÃO DE CONEXÃO DIRETA (SEM PROXY) ====================
function fetchDirect(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const transport = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'VISIONSTREAM-PRO/2.0',
                'Accept': 'audio/x-mpegurl, application/x-mpegurl, text/plain, */*',
                'Connection': 'keep-alive',
                ...options.headers
            },
            timeout: 20000
        };
        
        console.log(`🌐 Conectando DIRETAMENTE a: ${urlObj.hostname}`);
        
        const req = transport.request(reqOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Resposta recebida: ${res.statusCode}, ${data.length} bytes`);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Erro na conexão direta:', err.message);
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout de 20 segundos'));
        });
        
        req.end();
    });
}

// ==================== ROTA PRINCIPAL ====================
app.get('/api/playlist', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const validApiKey = process.env.API_KEY;
        
        // Validação da API_KEY
        if (!validApiKey) {
            return res.status(500).send('#EXTM3U\n# Erro: Servidor mal configurado (API_KEY)');
        }
        
        if (!apiKey || apiKey !== validApiKey) {
            return res.status(403).send('#EXTM3U\n# Erro: Acesso não autorizado');
        }
        
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Buscando: ${provider.name}`);
        console.log(`🔗 URL: ${provider.url}`);
        
        // Tentativa 1: Conexão DIRETA (como Vuplayer faz)
        try {
            const result = await fetchDirect(provider.url);
            
            if (!result.data || result.data.trim() === '') {
                throw new Error('Resposta vazia do provedor');
            }
            
            // Verificar se é M3U válido
            if (!result.data.includes('#EXT')) {
                console.warn('⚠️ Resposta pode não ser M3U:', result.data.substring(0, 200));
            }
            
            const channelCount = (result.data.match(/#EXTINF:/g) || []).length;
            console.log(`🎯 ${channelCount} canais carregados com sucesso!`);
            
            // Adicionar cabeçalho VISIONSTREAM
            const enhancedPlaylist = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
${result.data}`;
            
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(enhancedPlaylist);
            
        } catch (directError) {
            console.error('❌ Falha na conexão direta:', directError.message);
            
            // Tentativa 2: Usar node-fetch como fallback
            try {
                console.log('🔄 Tentando método alternativo...');
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(provider.url, {
                    headers: {
                        'User-Agent': 'VISIONSTREAM-PRO/2.0'
                    },
                    timeout: 15000
                });
                
                if (response.ok) {
                    const text = await response.text();
                    const channelCount = (text.match(/#EXTINF:/g) || []).length;
                    
                    console.log(`✅ Método alternativo OK: ${channelCount} canais`);
                    
                    res.setHeader('Content-Type', 'audio/x-mpegurl');
                    res.send(text);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
                
            } catch (fetchError) {
                console.error('❌ Todos os métodos falharam:', fetchError.message);
                
                // Playlist de erro informativa
                const errorPlaylist = `#EXTM3U
#EXTINF:-1 tvg-id="" tvg-name="❌ ERRO DE CONEXÃO" group-title="Erro",Não foi possível conectar ao provedor
# Provedor: ${provider.name}
# URL: ${provider.url}
# Erro: ${directError.message}
# Tente novamente em alguns instantes
http://example.com/error

#EXTINF:-1 tvg-id="" tvg-name="📞 SUPORTE" group-title="Informação",Entre em contato com o suporte
http://example.com/support`;
                
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                res.send(errorPlaylist);
            }
        }
        
    } catch (error) {
        console.error('💥 Erro fatal:', error);
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// ==================== ROTAS ADICIONAIS ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO (Direct Connection)',
        timestamp: new Date().toISOString(),
        providers: Object.keys(PROVIDERS).length
    });
});

app.get('/api/providers', (req, res) => {
    const providersList = Object.entries(PROVIDERS).map(([id, config]) => ({
        id,
        name: config.name,
        url: config.url.replace(/password=[^&]*/, 'password=***') // Esconde senha
    }));
    
    res.json({
        success: true,
        providers: providersList
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║   VISIONSTREAM PRO (DIRECT CONNECTION)   ║
    ║   🚀 Servidor rodando na porta ${PORT}     ║
    ╠═══════════════════════════════════════════╣
    ║   Conexão: DIRETA (sem proxy)            ║
    ║   Provedores: ${Object.keys(PROVIDERS).length} configurados          ║
    ║   Health: http://localhost:${PORT}/health    ║
    ╚═══════════════════════════════════════════╝
    `);
});
