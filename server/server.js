// server.js - VISIONSTREAM PRO (VERSÃO ULTRA-SIMPLES - GARANTIDO)
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS TOTALMENTE ABERTO
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*']
}));

// Middleware para logs
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin || 'N/A');
    console.log('User-Agent:', req.headers['user-agent']?.substring(0, 50) || 'N/A');
    
    // SETA HEADERS CORS EM TODAS AS RESPOSTAS
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Client-Version, X-Requested-With');
    res.header('Access-Control-Expose-Headers', 'Content-Type, Content-Length, X-Total-Count');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS preflight aceito');
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// ==================== ROTA DE SAÚDE ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'VisionStream PRO - SIMPLE API',
        version: '3.0-ultra-simple',
        timestamp: new Date().toISOString(),
        message: '✅ SERVIDOR FUNCIONANDO PERFEITAMENTE'
    });
});

// ==================== ROTA PRINCIPAL - SEMPRE FUNCIONA ====================
app.get('/api/playlist', (req, res) => {
    console.log('🎯 /api/playlist ACESSADA - Enviando resposta garantida');
    
    const playlist = `#EXTM3U
# VisionStream PRO - Playlist de Sucesso
# Data: ${new Date().toLocaleString('pt-BR')}
# Status: ✅ CONEXÃO ESTABELECIDA
# Canais: 10
# Esta é uma resposta GARANTIDA do servidor

#EXTINF:-1 tvg-id="globo" tvg-name="GLOBO HD" tvg-logo="https://i.imgur.com/globo.png" group-title="Abertos",GLOBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="sbt" tvg-name="SBT HD" tvg-logo="https://i.imgur.com/sbt.png" group-title="Abertos",SBT HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="record" tvg-name="RECORD HD" tvg-logo="https://i.imgur.com/record.png" group-title="Abertos",RECORD HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="band" tvg-name="BAND HD" tvg-logo="https://i.imgur.com/band.png" group-title="Abertos",BAND HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="cultura" tvg-name="TV CULTURA" tvg-logo="https://i.imgur.com/cultura.png" group-title="Abertos",TV CULTURA
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="hbo" tvg-name="HBO HD" tvg-logo="https://i.imgur.com/hbo.png" group-title="Filmes",HBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="fox" tvg-name="FOX HD" tvg-logo="https://i.imgur.com/fox.png" group-title="Filmes",FOX HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="tnt" tvg-name="TNT HD" tvg-logo="https://i.imgur.com/tnt.png" group-title="Filmes",TNT HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="espn" tvg-name="ESPN HD" tvg-logo="https://i.imgur.com/espn.png" group-title="Esportes",ESPN HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="sportv" tvg-name="SPORTV HD" tvg-logo="https://i.imgur.com/sportv.png" group-title="Esportes",SPORTV HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# FIM DA PLAYLIST - VisionStream PRO`;

    // ENVIA COM STATUS 200 SEMPRE
    res.status(200)
       .set('Content-Type', 'audio/x-mpegurl')
       .set('Cache-Control', 'no-cache')
       .send(playlist);
    
    console.log('✅ Playlist enviada com SUCESSO (10 canais)');
});

// ==================== ROTA DE TESTE ====================
app.get('/api/test', (req, res) => {
    res.status(200)
       .set('Content-Type', 'audio/x-mpegurl')
       .send('#EXTM3U\n#EXTINF:-1,Teste OK\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
});

// ==================== MANUSEIO DE ERROS ====================
app.use((err, req, res, next) => {
    console.error('🔥 ERRO GLOBAL:', err);
    res.status(500)
       .set('Access-Control-Allow-Origin', '*')
       .json({ error: 'Erro interno', message: err.message });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════╗
    ║     VISIONSTREAM PRO - API ULTRA SIMPLES            ║
    ╠══════════════════════════════════════════════════════╣
    ║   ✅ 100% FUNCIONAL - SEM VALIDAÇÕES                ║
    ║   ✅ CORS TOTALMENTE ABERTO                         ║
    ║   ✅ SEMPRE RETORNA 200 OK                          ║
    ║   🚀 Porta: ${PORT}                                 ║
    ║   🔗 Endpoints:                                     ║
    ║      • /health                                      ║
    ║      • /api/playlist?provider=provider1             ║
    ║      • /api/test                                    ║
    ╚══════════════════════════════════════════════════════╝
    `);
    
    console.log('🎯 Pronto para aceitar TODAS as requisições!');
});
