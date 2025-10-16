app.get('/api/tickets', async (req, res) => {
    try {
        const token = await getAccessToken();
        console.log('🔐 Token válido obtenido');
        
        // Intentar diferentes formatos de URL
        const urlsToTry = [
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items?expand=fields`,
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists('${LIST_ID}')/items?expand=fields`,
            `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/${LIST_ID}/items`
        ];
        
        let lastError;
        for (const url of urlsToTry) {
            try {
                console.log('🔍 Probando URL:', url);
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Éxito con URL:', url);
                const tickets = response.data.value.map(listItemToTicket);
                return res.json({
                    success: true,
                    count: tickets.length,
                    data: tickets
                });
                
            } catch (error) {
                lastError = error;
                console.log(`❌ Falló URL ${url}:`, error.response?.data?.error?.message || error.message);
                continue;
            }
        }
        
        // Si todas fallan
        throw lastError;
        
    } catch (error) {
        console.error('❌ Error fetching tickets después de todos los intentos:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
        
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener tickets',
            details: error.response?.data?.error || error.message
        });
    }
});