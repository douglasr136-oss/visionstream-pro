// server.js - VERSION M3U (Compatível com seu frontend atual)
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
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts',
        method: 'GET'
    },
    'provider2': {
        name: 'Provedor Secundário', 
        url: 'http://outroprovedor.com/api.php?user=cliente&pass=senha&type=m3u',
        method: 'GET'
    }
};

// ==================== FUNÇÃO DE CONEXÃO DIRETA ====================
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
        
        const req = transport.request(reqOptions, (res) => {
            let data = '';
            
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
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

// ==================== ROTA PRINCIPAL (M3U) ====================
app.get('/api/playlist', async (req, res) => {
    try {
        // 1. VALIDAÇÃO DA CHAVE (igual ao frontend)
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const validApiKey = process.env.API_KEY || 'visionstream_prod_1735661234';
        
        if (!apiKey || apiKey !== validApiKey) {
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(403).send('#EXTM3U\n# Erro: Acesso não autorizado');
        }
        
        // 2. IDENTIFICA PROVEDOR
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Buscando: ${provider.name}`);
        
        // 3. TENTA CONEXÃO DIRETA
        let m3uContent = '';
        try {
            const result = await fetchDirect(provider.url);
            
            if (!result.data || result.data.trim() === '') {
                throw new Error('Resposta vazia');
            }
            
            m3uContent = result.data;
            console.log(`✅ ${m3uContent.length} bytes recebidos`);
            
        } catch (directError) {
            console.error('❌ Falha na conexão direta:', directError.message);
            
            // Fallback com node-fetch
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(provider.url, {
                    headers: { 'User-Agent': 'VISIONSTREAM-PRO/2.0' },
                    timeout: 15000
                });
                
                if (response.ok) {
                    m3uContent = await response.text();
                    console.log(`✅ Fallback OK: ${m3uContent.length} bytes`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (fetchError) {
                console.error('❌ Todos os métodos falharam');
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                return res.send(`#EXTM3U
# Erro ao conectar ao provedor
# ${provider.name}
# ${fetchError.message}`);
            }
        }
        
        // 4. ADICIONA CABEÇALHO PERSONALIZADO
        const channelCount = (m3uContent.match(/#EXTINF:/g) || []).length;
        const enhancedM3U = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
${m3uContent}`;
        
        // 5. RETORNA M3U (como seu frontend espera)
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(enhancedM3U);
        
    } catch (error) {
        console.error('💥 Erro:', error);
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// ==================== ROTAS ADICIONAIS ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO (M3U API)',
        timestamp: new Date().toISOString()
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║   VISIONSTREAM PRO (M3U API)       ║
    ║   🚀 Porta: ${PORT}                 ║
    ║   ✅ Compatível com seu frontend    ║
    ╚══════════════════════════════════════╝
    `);
});
