require('dotenv').config();
const axios = require('axios');

console.log('Variables de entorno cargadas:');
console.log('TENANT_ID:', process.env.TENANT_ID);
console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? '***' + process.env.CLIENT_SECRET.slice(-4) : 'NO DEFINIDO');

// Resto del código igual...const axios = require('axios');

// PON LOS VALORES DIRECTAMENTE AQUÍ
const TENANT_ID = 'cc83b6f3-f221-4172-aafb-cc228257a1e6';
const CLIENT_ID = '5251df40-f85f-4de2-82a3-2c2ff9609bc0';
const CLIENT_SECRET = 'GYA8Q~OKu2wocUBNql_vPIvYD2pVe.dDmnzgDcEQ'; // ⬅️ PON EL NUEVO SECRET QUE GENERASTE

async function testToken() {
    console.log('🔐 Probando autenticación...');
    console.log('Tenant ID:', TENANT_ID);
    console.log('Client ID:', CLIENT_ID);
    
    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
    });

    try {
        console.log('📤 Enviando solicitud de token...');
        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('✅ ✅ ✅ TOKEN OBTENIDO EXITOSAMENTE!');
        console.log('Token type:', response.data.token_type);
        console.log('Expires in:', response.data.expires_in, 'segundos');
        console.log('Access token (inicio):', response.data.access_token.substring(0, 30) + '...');
        return true;
    } catch (error) {
        console.error('❌ ❌ ❌ ERROR OBTENIENDO TOKEN:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data?.error);
        console.error('Description:', error.response?.data?.error_description);
        
        if (error.response?.data?.error === 'invalid_client') {
            console.log('\n💡 SOLUCIÓN: El Client Secret es incorrecto o expiró.');
            console.log('   Ve a Azure Portal → App Registrations → Tu App → Certificates & secrets');
            console.log('   Genera un NUEVO Client Secret y actualiza el valor en el código.');
        }
        return false;
    }
}

testToken();