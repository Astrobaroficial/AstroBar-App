# 🌙 AstroBar - Plataforma de Promociones Nocturnas

> Conectando bares con usuarios en Buenos Aires, Argentina 🇦🇷

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/mysql-8.0%2B-blue.svg)](https://www.mysql.com/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-Production%20Ready-success.svg)]()

## 📖 Tabla de Contenidos

- [Descripción](#-descripción)
- [Stack Tecnológico](#-stack-tecnológico)
- [Características Principales](#-características-principales)
- [Requisitos](#-requisitos)
- [Instalación](#️-instalación)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Base de Datos](#-base-de-datos)
- [Estructura del Proyecto](#️-estructura-del-proyecto)
- [Sistema de Pagos](#-sistema-de-pagos)
- [API Documentation](#-api-documentation)
- [Producción](#-producción)
- [Testing](#-testing)
- [Licencia](#-licencia)

## 🎯 Descripción

AstroBar es una plataforma móvil que conecta bares nocturnos con usuarios en Buenos Aires, Argentina. Permite a los bares crear promociones flash y comunes, mientras que los usuarios pueden descubrirlas, aceptarlas y canjearlas mediante códigos QR únicos.

### ✨ Características Destacadas

- 🎁 **Promociones Flash**: Ofertas de 5-15 minutos con contador en tiempo real
- 📱 **QR Único**: Sistema de validación seguro con códigos QR de un solo uso
- 🏆 **Sistema de Niveles**: Copper → Bronze → Silver → Gold → Platinum
- 💰 **Comisiones Flexibles**: 5%-30% configurable por bar
- 🔔 **Notificaciones Push**: Alertas de promociones cercanas
- 📊 **Analytics Completo**: Dashboard para bares y administradores
- 🛡️ **Seguridad**: JWT, validación +18, auditoría completa

## 🚀 Stack Tecnológico

### Frontend
- **Framework**: React Native 0.74+
- **Runtime**: Expo SDK 51+
- **Lenguaje**: TypeScript 5.0+
- **Navegación**: React Navigation 6
- **Estado**: Context API + Hooks
- **UI**: Custom components + Expo Vector Icons
- **Cámara**: expo-camera (QR Scanner)
- **Notificaciones**: expo-notifications

### Backend
- **Framework**: Express.js 4.18+
- **Lenguaje**: TypeScript 5.0+
- **ORM**: Drizzle ORM
- **Autenticación**: JWT + Refresh Tokens
- **Validación**: Express Validator
- **Seguridad**: Helmet, CORS, Rate Limiting

### Base de Datos
- **Motor**: MySQL 8.0+
- **Migraciones**: Drizzle Kit
- **Backup**: mysqldump

### Servicios Externos
- **Pagos**: Stripe Connect
- **Mapas**: Google Maps API
- **Push Notifications**: Expo Push Service
- **Storage**: Local filesystem (escalable a S3)

### DevOps
- **Control de Versiones**: Git + GitHub
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript Compiler

## 📋 Requisitos

- Node.js 18+
- MySQL 8.0+
- npm o yarn
- Cuenta Stripe (para pagos)
- Google Maps API Key

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/Caskiuz/AstroBar-App.git
cd AstroBar

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Configurar base de datos
mysql -u root -p
CREATE DATABASE astrobar_db;
exit

# Aplicar schema
npm run db:push
```

## ⚙️ Límites Técnicos MVP (Configurables desde Panel Admin)

- 🏢 Máximo 100 bares activos (escalable sin límite)
- 🍽️ Máximo 80 productos por bar (configurable)
- 📸 Máximo 80 imágenes por bar (configurable)
- 🎁 Máximo 10 promociones comunes activas por bar (configurable)
- ⚡ Máximo 3 promociones flash activas por bar (configurable)
- 🖼️ Imágenes: max 1200px, 200-400kb, WebP/JPG
- ⚠️ Alertas automáticas al 90% de capacidad
- 🎛️ Todos los límites modificables desde panel admin sin tocar código

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Base de Datos
DATABASE_URL=mysql://root:password@localhost:3306/astrobar_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=astrobar_db

# JWT
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret

# Aplicación
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:8081
BACKEND_URL=http://localhost:5000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_token
```

## 🚀 Desarrollo

### Iniciar Backend
```bash
npm run server:start
```

### Iniciar Frontend
```bash
npm run expo:dev
```

### Iniciar Ambos
```bash
npm run dev
```

## 📊 Base de Datos

### Schema Principal

#### Tablas Core
```sql
-- Usuarios
users (id, name, email, phone, password, role, pushToken, ...)

-- Bares
businesses (id, name, address, latitude, longitude, ownerId, isActive, ...)

-- Promociones
promotions (id, businessId, title, type, originalPrice, promoPrice, 
            stock, stockConsumed, startTime, endTime, isActive, ...)

-- Transacciones
promotion_transactions (id, promotionId, userId, businessId, qrCode, 
                        status, amountPaid, platformCommission, 
                        businessRevenue, canCancelUntil, redeemedAt, ...)

-- Puntos de Usuario
user_points (id, userId, totalPoints, promotionsRedeemed, currentLevel, ...)

-- Comisiones por Bar
business_commissions (id, businessId, platformCommission, notes, ...)
```

### Migraciones Disponibles

```bash
# Aplicar todas las migraciones
mysql -u root -p astrobar_db < migrations/create_promotions_system.sql
mysql -u root -p astrobar_db < migrations/create_business_commissions.sql
mysql -u root -p astrobar_db < migrations/create_test_users.sql
mysql -u root -p astrobar_db < migrations/create_test_promotions.sql
```

### Usuarios de Prueba

```javascript
// Todos con contraseña: "password"
{
  customer: "cliente@test.com",
  business_owner: "bar@test.com",
  admin: "admin@test.com",
  super_admin: "superadmin@test.com"
}
```

### Backup y Restore

```bash
# Backup completo
mysqldump -u root -p astrobar_db > backup_$(date +%Y%m%d).sql

# Backup solo estructura
mysqldump -u root -p --no-data astrobar_db > schema.sql

# Restore
mysql -u root -p astrobar_db < backup.sql
```

## 🏗️ Estructura del Proyecto

```
AstroBar/
├── client/              # Frontend React Native + Expo
│   ├── components/      # 40+ componentes (FlashCountdown, BarPinMarker, etc.)
│   ├── screens/         # 80+ pantallas
│   │   ├── ActivePromotionsScreen.tsx
│   │   ├── PaymentScreen.tsx
│   │   ├── PromotionCartScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── CreateFlashPromotionScreen.tsx
│   │   └── CreateCommonPromotionScreen.tsx
│   ├── lib/             # api.ts (axios + JWT)
│   ├── contexts/        # AuthContext, CartContext
│   ├── navigation/      # Navegadores
│   └── constants/       # theme.ts, config.ts
├── server/              # Backend Express + TypeScript
│   ├── routes/          # Rutas API
│   │   ├── paymentRoutes.ts (Stripe)
│   │   ├── cartRoutes.ts
│   │   └── statsRoutes.ts
│   ├── uploads/         # Imágenes (profiles, products, businesses)
│   └── server.ts        # Servidor principal
├── shared/              # Código compartido
│   └── schema-mysql.ts  # Schema Drizzle ORM
└── android/             # Build Android
```

## 💳 Sistema de Pagos (Configurable)

### Comisiones Escalables
**El bar recibe 100% del precio de su producto. La plataforma cobra una comisión adicional al usuario.**

- **Comisión Inicial**: 5% adicional (Usuario paga: $100 producto + $5 comisión = $105)
- **Comisión Estándar**: 10% adicional (Usuario paga: $100 producto + $10 comisión = $110)
- **Comisión Premium**: 15% adicional (Usuario paga: $100 producto + $15 comisión = $115)
- **Comisión Máxima**: 30% adicional (Usuario paga: $100 producto + $30 comisión = $130)
- 🎛️ **Configurable por bar** desde panel admin
- 🎛️ **Configurable por promoción** (opcional)
- 📊 Historial de cambios de comisiones

### Flujo de Pago
1. Usuario acepta promoción (ej: $100)
2. Sistema calcula comisión del bar (ej: 5% = $5)
3. Usuario paga total con tarjeta (ej: $105)
4. Bar recibe 100% del precio del producto ($100)
5. Plataforma recibe comisión ($5)
6. Usuario recibe QR code único
7. Usuario tiene 60 segundos para cancelar (configurable)
8. Bar escanea QR para validar y entregar
9. Usuario gana 10 puntos automáticamente

## 📱 Funcionalidades

### Para Usuarios (+18 años)
- 🗺️ Mapa con bares cercanos (4 estados: cerrado, próximo a abrir, abierto, abierto con flash)
- ⚡ Promociones flash (5/10/15 minutos) con contador en tiempo real
- 🎁 Promociones comunes programadas
- 🛒 Carrito de promociones
- 💳 Pago con tarjeta (Stripe)
- 📲 QR code para canjear en el bar
- 🏆 Sistema de niveles: Copper → Bronze → Silver → Gold → Platinum
- 📊 Historial de promociones canjeadas
- 🔔 Notificaciones push de promos flash cercanas

### Para Bares
- 📊 Panel de administración completo
- ⚡ Crear promociones flash (máx 3 activas)
- 🎁 Crear promociones comunes (máx 10 activas)
- 🍽️ CRUD de menú (máx 80 productos)
- 📸 Subir fotos del bar (máx 80 imágenes)
- 🕐 Configurar horarios por día
- 📈 Estadísticas: ventas, canjes, top promociones
- 📱 Escanear QR para validar promociones
- 💰 Recibir 100% del precio de cada producto
- 📊 Ver comisión actual que se cobra al usuario

### Para Administradores (Panel Admin)
- 🎛️ **Control Total del Sistema**
- 👥 Gestión de usuarios (activar/desactivar/eliminar)
- 🏢 Gestión de bares (aprobar/rechazar/suspender)
- 💰 Configurar comisiones por bar (5% a 30%)
- ⚙️ Modificar límites del sistema en tiempo real
- 📢 Enviar notificaciones push masivas
- 📧 Enviar emails a usuarios/bares
- 📊 Dashboard con estadísticas completas
- ⚠️ Alertas automáticas de límites
- 📈 Ver ingresos y métricas en tiempo real
- 🔧 Configurar tiempos de cancelación
- 📝 Historial de todas las acciones (auditoría)

## 🔐 Seguridad

- ✅ Validación de edad +18 años obligatoria
- 🔑 JWT con refresh tokens
- 💳 Pagos seguros con Stripe (PCI compliant)
- ⏱️ QR codes con expiración
- 🚫 Cancelación de 60 segundos (configurable)
- 🔒 Autenticación por roles (usuario/bar/admin/super_admin)
- 📝 Auditoría completa de transacciones y acciones
- 🛡️ Panel admin protegido (solo admin/super_admin)
- 🔐 Rate limiting por usuario
- 📊 Logs de todas las acciones críticas

## 🎛️ Panel de Administración

### Acceso
```bash
# Aplicar migración de base de datos
mysql -u root -p astrobar_db < migrations/add_admin_panel_tables.sql

# Reiniciar servidor
npm run server:start
```

### Funcionalidades

#### Dashboard
- Total usuarios activos/inactivos
- Total bares activos/inactivos
- Ingresos totales en tiempo real
- Alertas de límites (90% = alerta)
- Progreso visual de capacidad

#### Gestión de Usuarios
- Ver lista completa
- Filtrar por rol y estado
- Activar/Desactivar
- Eliminar usuarios
- Ver historial de compras

#### Gestión de Bares
- Ver lista completa
- Aprobar/Rechazar nuevos bares
- Activar/Desactivar
- Suspender temporalmente
- Ver estadísticas por bar
- Configurar comisión individual

#### Configuración de Comisiones
- Ver comisiones de todos los bares
- Configurar comisión por bar (5% - 30%)
- Comisión por defecto: 30%
- Historial de cambios
- Notas por cada cambio

#### Configuración del Sistema
- `max_active_bars`: 100 (escalable)
- `max_products_per_bar`: 80
- `max_images_per_bar`: 80
- `max_common_promotions`: 10
- `max_flash_promotions`: 3
- `default_platform_commission`: 0.30 (30%)
- `cancellation_window_seconds`: 60
- Todos modificables en tiempo real

#### Notificaciones
- Enviar push a todos los usuarios
- Enviar push a todos los bares
- Enviar a usuario específico
- Enviar a bar específico
- Historial de notificaciones

## 📚 API Documentation

### Autenticación

Todas las rutas protegidas requieren header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints Principales

#### Promociones
```bash
# Público
GET    /api/promotions                    # Listar activas
GET    /api/promotions/:id                # Detalle

# Cliente (autenticado)
POST   /api/promotions/:id/accept         # Aceptar promoción
POST   /api/promotions/transactions/:id/cancel  # Cancelar
GET    /api/promotions/transactions/my    # Mis transacciones

# Bar (business_owner)
POST   /api/promotions                    # Crear promoción
PATCH  /api/promotions/:id                # Pausar/activar
POST   /api/promotions/redeem             # Canjear QR
```

#### Usuario
```bash
GET    /api/user/profile                  # Perfil
GET    /api/user/stats                    # Estadísticas
POST   /api/user/push-token               # Guardar token push
```

#### Bar
```bash
GET    /api/business/dashboard            # Dashboard
GET    /api/business/stats                # Estadísticas
GET    /api/business/hours                # Horarios
PUT    /api/business/hours                # Actualizar horarios
```

#### Admin
```bash
# Usuarios
GET    /api/admin/users                   # Listar
PATCH  /api/admin/users/:id/status        # Activar/desactivar
DELETE /api/admin/users/:id               # Eliminar

# Bares
GET    /api/admin/businesses              # Listar
PATCH  /api/admin/businesses/:id/verification  # Aprobar/rechazar

# Comisiones
GET    /api/admin/commissions             # Listar
POST   /api/admin/commissions             # Actualizar

# Transacciones
GET    /api/admin/transactions            # Todas
GET    /api/admin/promotions/dashboard    # Dashboard promociones

# Notificaciones
POST   /api/admin/notifications/push      # Enviar push
```

### Respuestas

#### Éxito
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error
```json
{
  "success": false,
  "error": "Mensaje de error"
}
```

### Códigos de Estado

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Escalabilidad

#### Cambiar Límite de Bares
```sql
-- Opción 1: Desde panel admin (recomendado)
-- Ir a "Configuración" → "max_active_bars" → Cambiar valor

-- Opción 2: Desde SQL
UPDATE system_settings 
SET value = '1000' 
WHERE key = 'max_active_bars';
```

#### Cambiar Comisión por Defecto
```sql
-- Desde panel admin o SQL
UPDATE system_settings 
SET value = '0.15' 
WHERE key = 'default_platform_commission';
```

#### Configurar Comisión por Bar
```sql
-- Desde panel admin o SQL
INSERT INTO business_commissions (business_id, platform_commission, notes, created_by)
VALUES ('bar_id_123', 0.05, 'Comisión inicial 5%', 'admin_id')
ON DUPLICATE KEY UPDATE platform_commission = 0.05;
```

## 🚀 Producción

### Preparación

#### 1. Variables de Entorno
```bash
# Crear archivo .env.production
NODE_ENV=production
PORT=5000
DATABASE_URL=mysql://user:pass@host:3306/astrobar_db
JWT_SECRET=<strong_secret>
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_MAPS_API_KEY=<production_key>
EXPO_ACCESS_TOKEN=<production_token>
```

#### 2. Base de Datos
```bash
# Crear base de datos de producción
mysql -u root -p
CREATE DATABASE astrobar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Aplicar migraciones
mysql -u root -p astrobar_db < migrations/create_promotions_system.sql
mysql -u root -p astrobar_db < migrations/create_business_commissions.sql
```

#### 3. Build
```bash
# Backend
npm run server:build

# Frontend (Android APK)
eas build --platform android --profile production

# Frontend (iOS)
eas build --platform ios --profile production
```

### Deployment

#### Backend (Node.js)
```bash
# Opción 1: PM2
npm install -g pm2
pm2 start dist/server.js --name astrobar-api
pm2 save
pm2 startup

# Opción 2: Docker
docker build -t astrobar-api .
docker run -d -p 5000:5000 --env-file .env.production astrobar-api

# Opción 3: Systemd
sudo systemctl enable astrobar-api
sudo systemctl start astrobar-api
```

#### Frontend (Expo)
```bash
# Publicar actualización OTA
eas update --branch production --message "Nueva versión"

# Subir a Google Play Store
eas submit --platform android

# Subir a App Store
eas submit --platform ios
```

### Monitoreo

#### Logs
```bash
# PM2
pm2 logs astrobar-api

# Docker
docker logs -f <container_id>

# Systemd
journalctl -u astrobar-api -f
```

#### Health Check
```bash
# Endpoint de salud
curl https://api.astrobar.com/health

# Respuesta esperada
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Backup Automatizado

```bash
# Crear script de backup diario
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p astrobar_db | gzip > /backups/astrobar_$DATE.sql.gz

# Mantener solo últimos 30 días
find /backups -name "astrobar_*.sql.gz" -mtime +30 -delete

# Agregar a crontab
0 2 * * * /path/to/backup.sh
```

### SSL/HTTPS

```bash
# Certbot (Let's Encrypt)
sudo certbot --nginx -d api.astrobar.com

# Renovación automática
sudo certbot renew --dry-run
```

### Escalabilidad

#### Load Balancer (Nginx)
```nginx
upstream astrobar_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name api.astrobar.com;
    
    location / {
        proxy_pass http://astrobar_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Base de Datos (Replicación)
```bash
# Master-Slave para lectura escalable
# Master: Escrituras
# Slaves: Lecturas
```

## 🧪 Testing

### Unit Tests
```bash
# Ejecutar tests
npm test

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

### Linting
```bash
# ESLint
npm run lint

# Fix automático
npm run lint:fix

# Prettier
npm run format
```

### Type Checking
```bash
# TypeScript
npm run check:types

# Watch mode
npm run check:types:watch
```

### E2E Testing
```bash
# Detox (React Native)
npm run test:e2e:ios
npm run test:e2e:android
```

### Manual Testing

#### Flujo Completo Usuario
1. Registro/Login
2. Ver mapa de bares
3. Seleccionar bar con promoción
4. Aceptar promoción
5. Confirmar pago
6. Recibir QR
7. Mostrar QR en bar
8. Verificar puntos ganados

#### Flujo Completo Bar
1. Login como business_owner
2. Crear promoción flash
3. Ver en panel de promociones activas
4. Escanear QR de cliente
5. Validar canje
6. Ver estadísticas actualizadas

#### Flujo Completo Admin
1. Login como admin
2. Aprobar nuevo bar
3. Configurar comisión
4. Monitorear transacciones
5. Enviar notificación push
6. Ver dashboard de promociones

## 📄 Licencia

Propietario - AstroBar © 2026

## 🆘 Soporte

Para soporte técnico, contacta al equipo de desarrollo.

---

**Hecho con 🌙 en Buenos Aires, Argentina 🇦🇷**
