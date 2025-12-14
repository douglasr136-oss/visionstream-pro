// server.js - VISIONSTREAM PRO (M3U API - Compatível com frontend atual)
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
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());

// ==================== SEUS PROVEDORES REAIS ====================
const PROVIDERS = {
    // PROVEDOR 1 - Caderno Online (SEU LINK ORIGINAL)
    'provider1': {
        name: 'Slim',
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
            timeout: 25000  // Aumentado para 25 segundos
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
            console.error('⏰ Timeout na conexão');
            req.destroy();
            reject(new Error('Timeout de 25 segundos'));
        });
        
        req.end();
    });
}

// ==================== ROTA PRINCIPAL (RETORNA M3U PURO) ====================
app.get('/api/playlist', async (req, res) => {
    console.log('\n' + '='.repeat(50));
    console.log('📥 NOVA REQUISIÇÃO RECEBIDA');
    console.log('='.repeat(50));
    
    try {
        // 1. VALIDAÇÃO DA CHAVE (COMO SEU FRONTEND ESPERA)
        const apiKey = req.headers['x-api-key'] || req.query.api_key;
        const validApiKey = process.env.API_KEY || 'visionstream_prod_1735661234';
        
        console.log(`🔑 API Key recebida: ${apiKey ? '✓' : '✗'}`);
        console.log(`🔑 API Key esperada: ${validApiKey.substring(0, 10)}...`);
        
        // DEBUG: Mostrar todos os headers
        console.log('📋 Headers recebidos:', JSON.stringify(req.headers, null, 2));
        console.log('🔍 Query params:', req.query);
        
        if (!apiKey || apiKey !== validApiKey) {
            console.warn('⚠️ API Key inválida ou ausente');
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(403).send('#EXTM3U\n# Erro: Acesso não autorizado\n# Verifique sua chave de API');
        }
        
        // 2. IDENTIFICA PROVEDOR
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            console.error(`❌ Provedor não encontrado: ${providerId}`);
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Provedor selecionado: ${provider.name} (${providerId})`);
        console.log(`🔗 URL do provedor: ${provider.url}`);
        
        // 3. TENTA CONEXÃO DIRETA AO PROVEDOR
        let m3uContent = '';
        try {
            console.log('🔄 Tentando conexão direta...');
            const result = await fetchDirect(provider.url);
            
            if (!result.data || result.data.trim() === '') {
                throw new Error('Resposta vazia do provedor');
            }
            
            m3uContent = result.data;
            console.log(`✅ Conexão direta bem-sucedida: ${m3uContent.length} bytes`);
            
        } catch (directError) {
            console.error('❌ Falha na conexão direta:', directError.message);
            
            // 4. FALLBACK COM NODE-FETCH (se instalado)
            try {
                console.log('🔄 Tentando método alternativo (node-fetch)...');
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(provider.url, {
                    headers: { 
                        'User-Agent': 'VISIONSTREAM-PRO/2.0',
                        'Accept': 'audio/x-mpegurl, text/plain, */*'
                    },
                    timeout: 20000
                });
                
                if (response.ok) {
                    m3uContent = await response.text();
                    console.log(`✅ Método alternativo OK: ${m3uContent.length} bytes`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (fetchError) {
                console.error('❌ Todos os métodos falharam:', fetchError.message);
                
                // Retorna M3U de erro informativo
                const errorM3U = `#EXTM3U
#EXTINF:-1 tvg-id="" tvg-name="❌ ERRO DE CONEXÃO" group-title="Erro",Não foi possível conectar ao provedor
# Provedor: ${provider.name}
# URL: ${provider.url}
# Erro: ${directError.message}
# Tente novamente em alguns instantes
http://example.com/error

#EXTINF:-1 tvg-id="" tvg-name="📞 SUPORTE" group-title="Informação",Entre em contato com o suporte
http://example.com/support`;
                
                res.setHeader('Content-Type', 'audio/x-mpegurl');
                res.setHeader('Cache-Control', 'no-cache');
                return res.send(errorM3U);
            }
        }
        
        // 5. ANALISA O CONTEÚDO RECEBIDO
        console.log('🔍 Analisando conteúdo M3U...');
        
        if (!m3uContent.includes('#EXTM3U')) {
            console.warn('⚠️ Conteúdo pode não ser M3U válido');
            console.log('📄 Primeiros 500 caracteres:', m3uContent.substring(0, 500));
        }
        
        const channelCount = (m3uContent.match(/#EXTINF:/g) || []).length;
        console.log(`🎯 Canais detectados: ${channelCount}`);
        
        if (channelCount === 0 && m3uContent.length > 100) {
            console.warn('⚠️ Muitos dados mas nenhum canal detectado. Verifique o formato.');
            console.log('📄 Amostra do conteúdo:', m3uContent.substring(0, 300));
        }
        
        // 6. ADICIONA CABEÇALHO VISIONSTREAM
        const enhancedM3U = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
# URL Original: ${provider.url}
${m3uContent}`;
        
        // 7. RETORNA M3U (FORMATO ESPERADO PELO SEU FRONTEND)
        console.log(`📤 Enviando resposta: ${enhancedM3U.length} bytes, ${channelCount} canais`);
        
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-VISIONSTREAM-Channels', channelCount);
        res.setHeader('X-VISIONSTREAM-Provider', provider.name);
        
        res.send(enhancedM3U);
        
        console.log(`✅ Resposta enviada com sucesso!`);
        console.log('='.repeat(50) + '\n');
        
    } catch (error) {
        console.error('💥 ERRO FATAL NA ROTA /api/playlist:', error);
        console.error('Stack trace:', error.stack);
        
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.status(500).send('#EXTM3U\n# Erro interno do servidor\n# ' + error.message);
    }
});

// ==================== ROTAS ADICIONAIS ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO (M3U API)',
        timestamp: new Date().toISOString(),
        providers: Object.keys(PROVIDERS).length,
        environment: process.env.NODE_ENV || 'development'
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

// ==================== ROTA DE TESTE SIMPLES ====================
app.get('/api/test', (req, res) => {
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.send(`#EXTM3U
#EXTINF:-1 tvg-id="Test1" tvg-name="📺 CANAL TESTE 1" tvg-logo="https://via.placeholder.com/100" group-title="Teste",Canal de Teste 1
http://example.com/test1

#EXTINF:-1 tvg-id="Test2" tvg-name="⚽ ESPN TESTE" tvg-logo="https://via.placeholder.com/100" group-title="Esportes",ESPN Teste
http://example.com/test2

#EXTINF:-1 tvg-id="Test3" tvg-name="🎬 HBO TESTE" tvg-logo="https://via.placeholder.com/100" group-title="Filmes",HBO Teste
http://example.com/test3`);
});

// ==================== MIDDLEWARE DE LOG ====================
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// ==================== MANIPULADOR DE ERROS ====================
app.use((err, req, res, next) => {
    console.error('🔥 ERRO NÃO TRATADO:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║       VISIONSTREAM PRO - SERVIDOR M3U API        ║
    ╠═══════════════════════════════════════════════════╣
    ║   🚀 Servidor rodando na porta ${PORT}           ║
    ║   📡 ${Object.keys(PROVIDERS).length} provedor(es) configurado(s) ║
    ║   🔗 Frontend: https://visionstream-app.onrender.com ║
    ╠═══════════════════════════════════════════════════╣
    ║   ENDPOINTS:                                     ║
    ║   • /api/playlist?provider=provider1             ║
    ║   • /health (status do servidor)                 ║
    ║   • /api/test (playlist de teste)                ║
    ║   • /api/providers (lista de provedores)         ║
    ╚═══════════════════════════════════════════════════╝
    `);
    
    console.log('🔧 Configuração:');
    console.log(`   • API Key esperada: ${process.env.API_KEY ? '✓ Configurada' : '✗ Usando padrão'}`);
    console.log(`   • Provedor 1: ${PROVIDERS.provider1.url.substring(0, 50)}...`);
});
