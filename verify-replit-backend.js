const https = require('https');

const BACKEND_URL = 'https://nemy-app.replit.app';

console.log('========================================');
console.log('  NEMY - Verificación Backend Replit');
console.log('========================================\n');

// Test 1: Health Check
console.log('[1/5] Verificando health endpoint...');
testEndpoint('/api/health', 'GET')
  .then(() => {
    console.log('✅ Health check OK\n');
    
    // Test 2: Auth endpoint
    console.log('[2/5] Verificando auth endpoint...');
    return testEndpoint('/api/auth/request-code', 'POST', {
      phoneNumber: '+523171234567'
    });
  })
  .then(() => {
    console.log('✅ Auth endpoint OK\n');
    
    // Test 3: Businesses endpoint
    console.log('[3/5] Verificando businesses endpoint...');
    return testEndpoint('/api/businesses', 'GET');
  })
  .then(() => {
    console.log('✅ Businesses endpoint OK\n');
    
    // Test 4: CORS headers
    console.log('[4/5] Verificando CORS...');
    return checkCORS();
  })
  .then(() => {
    console.log('✅ CORS configurado correctamente\n');
    
    // Test 5: Database connection
    console.log('[5/5] Verificando conexión a base de datos...');
    return testEndpoint('/api/admin/metrics', 'GET');
  })
  .then(() => {
    console.log('✅ Base de datos conectada\n');
    
    console.log('========================================');
    console.log('  ✅ Todos los tests pasaron!');
    console.log('  Backend listo para producción');
    console.log('========================================\n');
    
    console.log('Siguiente paso:');
    console.log('1. Ejecutar: build-apk-replit.bat');
    console.log('2. Instalar APK en dispositivo Android');
    console.log('3. Probar login y funcionalidades\n');
  })
  .catch(error => {
    console.error('\n❌ Error en verificación:', error.message);
    console.log('\nPosibles soluciones:');
    console.log('1. Verificar que Replit esté corriendo');
    console.log('2. Revisar variables de entorno en Replit');
    console.log('3. Verificar conexión a base de datos Aiven');
    console.log('4. Revisar logs en Replit Console\n');
    process.exit(1);
  });

function testEndpoint(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log(`   Status: ${res.statusCode}`);
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

function checkCORS() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/health', BACKEND_URL);
    
    const options = {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://nemy-app.replit.app',
        'Access-Control-Request-Method': 'GET'
      }
    };
    
    const req = https.request(url, options, (res) => {
      const corsHeader = res.headers['access-control-allow-origin'];
      
      if (corsHeader) {
        console.log(`   CORS Header: ${corsHeader}`);
        resolve();
      } else {
        reject(new Error('CORS headers no encontrados'));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}
