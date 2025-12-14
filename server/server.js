// server.js - VISIONSTREAM PRO PROXY (M3U API)
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração
app.use(cors({
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());

// Provedores
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

// Função de conexão
function fetchDirect(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const transport = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'VISIONSTREAM-PRO/2.0',
                'Accept': 'audio/x-mpegurl, text/plain, */*',
                'Connection': 'keep-alive'
            },
            timeout: 25000
        };
        
        const req = transport.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: data });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

// Rota principal
app.get('/api/playlist', async (req, res) => {
    try {
        // Validação
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const validApiKey = process.env.API_KEY || 'visionstream_prod_1735661234';
        
        if (!apiKey || apiKey !== validApiKey) {
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(403).send('#EXTM3U\n# Erro: Acesso não autorizado');
        }
        
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Buscando: ${provider.name}`);
        
        // Buscar playlist
        let m3uContent = '';
        try {
            const result = await fetchDirect(provider.url);
            m3uContent = result.data;
            console.log(`✅ ${m3uContent.length} bytes recebidos`);
        } catch (error) {
            console.error('❌ Erro:', error.message);
            
            // Fallback com fetch
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(provider.url, {
                    headers: { 'User-Agent': 'VISIONSTREAM-PRO/2.0' },
                    timeout: 20000
                });
                
                if (response.ok) {
                    m3uContent = await response.text();
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (fetchError) {
                console.error('❌ Todos os métodos falharam');
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                return res.send(`#EXTM3U\n# Erro ao conectar ao provedor\n# ${fetchError.message}`);
            }
        }
        
        // Adicionar cabeçalho
        const channelCount = (m3uContent.match(/#EXTINF:/g) || []).length;
        const enhancedM3U = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
${m3uContent}`;
        
        // Retornar
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(enhancedM3U);
        
    } catch (error) {
        console.error('💥 Erro:', error);
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// Rotas auxiliares
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.send(`#EXTM3U
#EXTINF:-1,Teste 1
http://example.com/test1
#EXTINF:-1,Teste 2  
http://example.com/test2`);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════╗
    ║   VISIONSTREAM PRO - Proxy      ║
    ║   🚀 Porta: ${PORT}             ║
    ║   ✅ Pronto para uso            ║
    ╚══════════════════════════════════╝
    `);
});
