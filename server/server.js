// server.js - VISIONSTREAM PRO Proxy com Provedores Reais
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
// SUAS CREDENCIAIS REAIS AQUI - MESMAS QUE USAM NO VUPLAYER/IBO PRO
const PROVIDERS_CONFIG = {
    // PROVEDOR 1 - Caderno Online (SEU LINK QUE FUNCIONA)
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
    
    // PROVEDOR 2 - Adicione seu segundo provedor (SE TIVER)
    'provider2': {
        name: 'Provedor Secundário',
        url: 'http://SEU-SEGUNDO-PROVEDOR.com/get.php',
        params: {
            username: 'SEU_USUARIO',
            password: 'SUA_SENHA',
            type: 'm3u_plus',
            output: 'mpegts'
        }
    }
    
    // PARA ADICIONAR MAIS PROVEDORES, COPIE E COLE AQUI:
    // 'provider3': {
    //     name: 'Nome do Provedor 3',
    //     url: 'http://provedor3.com/get.php',
    //     params: {
    //         username: 'usuario3',
    //         password: 'senha3',
    //         type: 'm3u_plus',
    //         output: 'mpegts'
    //     }
    // }
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
    console.log('🔗 Buscando playlist:', url);
    
    try {
        // Método 1: Usar proxy CORS (funciona para 90% dos casos)
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (VISIONSTREAM-PRO/2.0)',
                'Accept': 'audio/x-mpegurl, application/x-mpegurl, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            throw new Error(`Proxy status: ${response.status}`);
        }
        
        const text = await response.text();
        
        // Verificação básica do conteúdo
        if (!text || text.trim() === '') {
            throw new Error('Playlist vazia recebida do provedor');
        }
        
        if (!text.includes('#EXT')) {
            console.warn('⚠️ Resposta não parece M3U:', text.substring(0, 200));
            // Ainda retornamos, pode ser formato diferente
        }
        
        console.log('✅ Playlist obtida:', text.length, 'bytes');
        return {
            success: true,
            data: text,
            contentType: 'audio/x-mpegurl'
        };
        
    } catch (error) {
        console.error('❌ Erro no método 1:', error.message);
        
        // Método 2: Proxy alternativo
        try {
            const proxyUrl2 = 'https://corsproxy.io/?' + encodeURIComponent(url);
            const response2 = await fetch(proxyUrl2, {
                headers: {
                    'User-Agent': 'VISIONSTREAM-PRO/2.0'
                },
                timeout: 10000
            });
            
            if (response2.ok) {
                const text2 = await response2.text();
                console.log('✅ Playlist obtida via proxy alternativo');
                return {
                    success: true,
                    data: text2,
                    contentType: 'audio/x-mpegurl'
                };
            }
            
            throw new Error('Todos os proxies falharam');
            
        } catch (error2) {
            console.error('❌ Todos os métodos falharam:', error2.message);
            
            // Fallback: playlist de teste informativa
            const fallbackPlaylist = `#EXTM3U
#EXTINF:-1 tvg-id="" tvg-name="⚠️ CONEXÃO COM PROVEDOR" group-title="Informação",Problema temporário de conexão
# NÃO FOI POSSÍVEL CONECTAR AO PROVEDOR NO MOMENTO
# URL tentada: ${url}
# Tente novamente em alguns minutos
# Se o problema persistir, verifique suas credenciais
http://example.com/placeholder

#EXTINF:-1 tvg-id="" tvg-name="📞 SUPORTE" group-title="Informação",Contate o suporte se necessário
http://example.com/support`;
            
            return {
                success: true,
                data: fallbackPlaylist,
                contentType: 'audio/x-mpegurl'
            };
        }
    }
}

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKey = process.env.API_KEY;
    
    if (!validApiKey) {
        console.error('❌ ERRO: API_KEY não configurada no ambiente');
        return res.status(500).send('#EXTM3U\n# Erro: Servidor mal configurado');
    }
    
    if (!apiKey) {
        return res.status(401).send('#EXTM3U\n# Erro: Chave de API não fornecida');
    }
    
    if (apiKey !== validApiKey) {
        console.warn('⚠️ Tentativa de acesso com chave inválida');
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
            return res.status(400).send('#EXTM3U\n# Erro: Provedor especificado não existe');
        }
        
        console.log(`📡 Buscando playlist do provedor: ${providerConfig.name}`);
        
        // Construir URL do provedor com parâmetros
        const providerUrl = buildProviderUrl(providerConfig);
        console.log('🔗 URL do provedor:', providerUrl);
        
        // Buscar playlist
        const result = await fetchPlaylist(providerUrl);
        
        if (!result.success) {
            return res.status(502).send(`#EXTM3U\n# Erro ao conectar com o provedor\n# Detalhes: ${result.error}`);
        }
        
        // Adicionar cabeçalho informativo
        const enhancedPlaylist = `#EXTM3U
# Playlist processada por VISIONSTREAM PRO
# Provedor: ${providerConfig.name}
# Data/Hora: ${new Date().toLocaleString('pt-BR')}
# Total de canais: ${(result.data.match(/#EXTINF:/g) || []).length}
${result.data}`;
        
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('X-Provider', providerConfig.name);
        res.setHeader('X-Processed-By', 'VISIONSTREAM-PRO/2.0');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos de cache
        
        console.log(`✅ Playlist entregue com sucesso do provedor: ${providerConfig.name}`);
        res.send(enhancedPlaylist);
        
    } catch (error) {
        console.error('💥 Erro inesperado no proxy:', error);
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// Rota para listar provedores disponíveis
app.get('/api/providers', validateApiKey, (req, res) => {
    const providersList = Object.entries(PROVIDERS_CONFIG).map(([id, config]) => ({
        id,
        name: config.name,
        hasCredentials: !!(config.params.username && config.params.password)
    }));
    
    res.json({
        success: true,
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0',
        timestamp: new Date().toISOString(),
        providers: providersList
    });
});

// Rota de saúde
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0',
        timestamp: new Date().toISOString(),
        providers_configured: Object.keys(PROVIDERS_CONFIG).length,
        uptime: process.uptime()
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({
        message: 'Bem-vindo ao VISIONSTREAM PRO Proxy API',
        version: '2.0',
        endpoints: {
            playlist: '/api/playlist?provider=provider1&api_key=SUA_CHAVE',
            providers: '/api/providers?api_key=SUA_CHAVE',
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
    
    // Log dos provedores configurados
    console.log('\n📋 Provedores Configurados:');
    Object.entries(PROVIDERS_CONFIG).forEach(([id, config]) => {
        console.log(`   ${id}: ${config.name}`);
    });
    console.log('');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Rejeição não tratada em:', promise, 'motivo:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Exceção não capturada:', error);
});
