require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares esenciales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));
app.use(cors());
// Agrega esto para ver las columnas EXACTAS de tu lista
app.get('/api/debug/list-columns', async (req, res) => {
    try {
        console.log('\n=== 🔍 BUSCANDO COLUMNAS DE LA LISTA ===');
        
        const token = await getAccessToken();
        
        // Obtener todas las columnas de la lista
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/columns`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('📊 COLUMNAS ENCONTRADAS:');
        console.log('='.repeat(60));
        
        response.data.value.forEach((column, index) => {
            console.log(`\n${index + 1}. 📝 "${column.displayName}"`);
            console.log(`   🔤 Nombre interno: "${column.name}"`);
            console.log(`   📍 Tipo: ${column.text ? 'Texto' : 'Choice' || 'Otro'}`);
            console.log(`   📏 Líneas: ${column.text?.lineCount || '1'}`);
            console.log(`   📌 Requerido: ${column.required || 'No'}`);
        });
        
        res.json({
            success: true,
            columns: response.data.value.map(col => ({
                displayName: col.displayName,
                name: col.name,
                type: col.text ? 'text' : (col.choice ? 'choice' : 'other'),
                required: col.required || false
            }))
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo columnas:');
        console.error('Detalles:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al obtener columnas' });
    }
});

// Agrega esto para encontrar todos los sitios accesibles
app.get('/api/debug/find-all-sites', async (req, res) => {
    try {
        console.log('\n=== 🔍 BUSCANDO TODOS LOS SITIOS ACCESIBLES ===');
        
        const token = await getAccessToken();
        console.log('✅ Token obtenido');
        
        // Buscar todos los sitios
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites?search=*`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log(`📊 Se encontraron ${response.data.value.length} sitios:`);
        console.log('=' .repeat(50));
        
        response.data.value.forEach((site, index) => {
            console.log(`\n${index + 1}. 🏢 ${site.displayName}`);
            console.log(`   🔗 URL: ${site.webUrl}`);
            console.log(`   🆔 ID: ${site.id}`);
            console.log(`   📍 Name: ${site.name}`);
        });
        
        // Buscar específicamente sitios con "beta" o "test"
        const betaSites = response.data.value.filter(site => 
            site.displayName.toLowerCase().includes('beta') || 
            site.displayName.toLowerCase().includes('test')
        );
        
        if (betaSites.length > 0) {
            console.log('\n🎯 SITIOS QUE COINCIDEN CON "BETA" O "TEST":');
            betaSites.forEach(site => {
                console.log(`   ✅ ${site.displayName} - ID: ${site.id}`);
            });
        }
        
        res.json({
            success: true,
            totalSites: response.data.value.length,
            sites: response.data.value.map(site => ({
                displayName: site.displayName,
                webUrl: site.webUrl,
                id: site.id,
                name: site.name
            })),
            betaSites: betaSites.map(site => ({
                displayName: site.displayName,
                id: site.id
            }))
        });
        
    } catch (error) {
        console.error('❌ Error buscando sitios:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data?.error || error.message);
        
        res.status(500).json({ 
            success: false,
            error: 'Error buscando sitios',
            details: error.response?.data?.error || error.message
        });
    }
});
// Configuración de Microsoft Graph API
const TENANT_ID = process.env.TENANT_ID || 'cc83b6f3-f221-4172-aafb-cc228257a1e6';
const CLIENT_ID = process.env.CLIENT_ID || '5251df40-f85f-4de2-82a3-2c2ff9609bc0';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'GYA8Q~OKu2wocUBNql_vPIvYD2pVe.dDmnzgDcEQ';
const SITE_ID = process.env.SITE_ID || 'fd2f9cdd-43ce-4476-a43d-544d54b58f8d';
const LIST_ID = process.env.LIST_ID || '736e7dc6-a6b5-4c05-8b22-bf2249d48346';

// Cache para el token
let tokenCache = {
    token: null,
    expiry: null
};

// Middleware para logs
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Obtener token de acceso
async function getAccessToken() {
    if (tokenCache.token && tokenCache.expiry && Date.now() < tokenCache.expiry) {
        return tokenCache.token;
    }

    const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
    });

    try {
        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        tokenCache = {
            token: response.data.access_token,
            expiry: Date.now() + (response.data.expires_in * 1000) - (5 * 60 * 1000)
        };
        
        console.log('✅ Token obtenido exitosamente');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Error getting token:', error.response?.data || error.message);
        throw new Error('No se pudo obtener el token de acceso');
    }
}

// CORREGIDO: Función para mapear campos según tu lista real
function listItemToTicket(item) {
    return {
        id: item.id,
        nombre: item.fields?.Nom || '',           // Cambiado: "Item" → "Nom"
        email: item.fields?.Email || '',
        asunto: item.fields?.Assumpte || '',
        descripcion: item.fields?.Descripci_x00f3_ || '', // Cambiado: "Title" → "Descripci_x00f3_"
        prioridad: item.fields?.Prioritat || 'media',     // Cambiado: "Piment" → "Prioritat"
        estado: item.fields?.Estado || 'Abierto',
        asignado_a: item.fields?.AsignadoA || '',
        fecha: item.fields?.DatadeCreaci_x00f3_ || item.createdDateTime || '', // Cambiado
        fechaCierre: item.fields?.FechaCierre || '',
        lastModified: item.lastModifiedDateTime || '',
        webUrl: item.webUrl || ''
    };
}

// CORREGIDO: Crear nuevo ticket con nombres exactos
app.post('/api/tickets', async (req, res) => {
    try {
        console.log('📝 Body recibido:', req.body);
        
        const token = await getAccessToken();
        const { nombre, email, asunto, descripcion, prioridad, estado } = req.body;

        // ✅ USANDO LOS NOMBRES EXACTOS DE TUS COLUMNAS
        const ticketData = {
            fields: {
                Title: asunto || 'Nuevo ticket',  // Title es obligatorio en SharePoint
                Nom: nombre || '',                // ✅ "Nom" (no "Item")
                Email: email || '',               // ✅ "Email" 
                Assumpte: asunto || '',           // ✅ "Assumpte"
                Prioritat: prioridad || 'media',  // ✅ "Prioritat" (no "Piment")
                Descripci_x00f3_: descripcion || '', // ✅ "Descripci_x00f3_" (no "Title")
                DatadeCreaci_x00f3_: new Date().toISOString(), // ✅ "DatadeCreaci_x00f3_"
                Estado: estado || 'Abierto'       // ✅ "Estado"
            }
        };

        console.log('📤 Enviando a Graph API (corregido):', ticketData);

        const response = await axios.post(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
            ticketData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ ✅ ✅ TICKET CREADO EXITOSAMENTE!');
        console.log('ID del ticket:', response.data.id);

        res.json({
            success: true,
            data: listItemToTicket(response.data),
            message: 'Ticket creado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creating ticket:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        
        res.status(500).json({ 
            success: false,
            error: 'Error al crear ticket',
            details: error.response?.data?.error || error.message,
            code: error.response?.status
        });
    }
});

// CORREGIDO: Actualizar ticket
app.put('/api/tickets/:id', async (req, res) => {
    try {
        const token = await getAccessToken();
        const { id } = req.params;
        const { estado, asignado_a, fechaCierre, prioridad } = req.body;

        const updateFields = {};
        if (estado !== undefined) updateFields.Estado = estado;
        if (asignado_a !== undefined) updateFields.AsignadoA = asignado_a;
        if (fechaCierre !== undefined) updateFields.FechaCierre = fechaCierre;
        if (prioridad !== undefined) updateFields.Prioritat = prioridad; // ✅ Cambiado a "Prioritat"

        console.log('📝 Actualizando ticket:', id, updateFields);

        const response = await axios.patch(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items/${id}/fields`,
            updateFields,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            data: listItemToTicket(response.data),
            message: 'Ticket actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error updating ticket:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Error al actualizar ticket',
            details: error.response?.data?.error || error.message
        });
    }
});

// **NUEVO: Endpoint para verificar la lista y campos**
app.get('/api/debug/list-info', async (req, res) => {
    try {
        const token = await getAccessToken();
        
        // Obtener información de la lista
        const listResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Obtener columnas de la lista
        const columnsResponse = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/columns`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            list: listResponse.data,
            columns: columnsResponse.data.value
        });
    } catch (error) {
        console.error('Error debug:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Error al obtener información de la lista',
            details: error.response?.data?.error || error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Microsoft Lists API - Gestió Tickets'
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'helpdesk.html'));
});

// Obtener todos los tickets - CORREGIDO
app.get('/api/tickets', async (req, res) => {
    try {
        const token = await getAccessToken();
        
        const response = await axios.get(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items?expand=fields`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const tickets = response.data.value.map(listItemToTicket);
        console.log(`📊 Se obtuvieron ${tickets.length} tickets`);
        
        res.json({
            success: true,
            count: tickets.length,
            data: tickets
        });
    } catch (error) {
        console.error('❌ Error fetching tickets:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener tickets',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

// **CORREGIDO: Crear nuevo ticket con campos correctos**
app.post('/api/tickets', async (req, res) => {
    try {
        console.log('📝 Body recibido:', req.body);
        
        const token = await getAccessToken();
        const { nombre, email, asunto, descripcion, prioridad, estado } = req.body;

        // **CAMBIOS CRÍTICOS: Usar los nombres exactos de tus columnas**
        const ticketData = {
            fields: {
                Title: descripcion || 'Nuevo ticket', // Title es obligatorio en SharePoint
                Item: nombre || '',                   // Tu columna "Item" para el nombre
                Email: email || '',                   // Tu columna "Email" 
                Assumpte: asunto || '',              // Tu columna "Assumpte" para el asunto
                Piment: prioridad || 'media',        // Tu columna "Piment" para prioridad
                Estado: estado || 'Abierto',         // Columna Estado (si existe)
                'Data de Cassió': new Date().toISOString() // Tu columna de fecha
            }
        };

        console.log('📤 Enviando a Graph API:', ticketData);

        const response = await axios.post(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`,
            ticketData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Ticket creado exitosamente:', response.data.id);

        res.json({
            success: true,
            data: listItemToTicket(response.data),
            message: 'Ticket creado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error creating ticket:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Message:', error.message);
        
        res.status(500).json({ 
            success: false,
            error: 'Error al crear ticket',
            details: error.response?.data?.error || error.message,
            code: error.response?.status
        });
    }
});

// Actualizar ticket
app.put('/api/tickets/:id', async (req, res) => {
    try {
        const token = await getAccessToken();
        const { id } = req.params;
        const { estado, asignado_a, fechaCierre, prioridad } = req.body;

        const updateFields = {};
        if (estado !== undefined) updateFields.Estado = estado;
        if (asignado_a !== undefined) updateFields.AsignadoA = asignado_a;
        if (fechaCierre !== undefined) updateFields.FechaCierre = fechaCierre;
        if (prioridad !== undefined) updateFields.Piment = prioridad; // Cambiado a Piment

        console.log('📝 Actualizando ticket:', id, updateFields);

        const response = await axios.patch(
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items/${id}/fields`,
            updateFields,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            data: listItemToTicket(response.data),
            message: 'Ticket actualizado exitosamente'
        });
    } catch (error) {
        console.error('❌ Error updating ticket:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Error al actualizar ticket',
            details: error.response?.data?.error || error.message
        });
    }
});

// Manejo de errores
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🐛 Debug lista: http://localhost:${port}/api/debug/list-info`);
    console.log(`🎫 Tickets API: http://localhost:${port}/api/tickets`);
});