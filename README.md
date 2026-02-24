# 🌙 AstroBar - Plataforma de Promociones Nocturnas

> Conectando bares con usuarios en Buenos Aires, Argentina 🇦🇷

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/mysql-8.0%2B-blue.svg)](https://www.mysql.com/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

## 🚀 Stack Tecnológico

- **Frontend**: React Native + Expo
- **Backend**: Express.js + TypeScript
- **Base de Datos**: MySQL + Drizzle ORM
- **Pagos**: Stripe Connect (70% bar / 30% plataforma)
- **Notificaciones**: Expo Push Notifications
- **Mapas**: Google Maps API

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

### Schema
El schema completo está en `shared/schema-mysql.ts`

### Migraciones
```bash
# Aplicar cambios al schema
npm run db:push

# Backup
mysqldump -u root -p astrobar_db > backup.sql

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
- **Comisión Inicial**: 5% plataforma / 95% bar
- **Comisión Estándar**: 10% plataforma / 90% bar
- **Comisión Premium**: 15% plataforma / 85% bar
- **Comisión Máxima**: 30% plataforma / 70% bar
- 🎛️ **Configurable por bar** desde panel admin
- 🎛️ **Configurable por promoción** (opcional)
- 📊 Historial de cambios de comisiones

### Flujo de Pago
1. Usuario acepta promoción y paga con tarjeta (Stripe)
2. Pago procesado y split automático según comisión configurada
3. Usuario recibe QR code único
4. Usuario tiene 60 segundos para cancelar (configurable)
5. Bar escanea QR para validar y entregar
6. Usuario gana 10 puntos automáticamente
7. Comisión transferida automáticamente a AstroBar
8. Bar recibe su porcentaje en cuenta Stripe Connect

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
- 💰 Recibir 70-95% de cada venta automáticamente (según comisión configurada)
- 📊 Ver comisión actual en tiempo real

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

### API Endpoints Admin

```bash
# Configuración
GET    /api/admin/settings
PUT    /api/admin/settings/:key
POST   /api/admin/settings

# Usuarios
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id/status
DELETE /api/admin/users/:id

# Bares
GET    /api/admin/businesses
GET    /api/admin/businesses/:id
PATCH  /api/admin/businesses/:id/status
PATCH  /api/admin/businesses/:id/verification
PATCH  /api/admin/businesses/:id/pause

# Comisiones
GET    /api/admin/commissions
GET    /api/admin/commissions/:businessId
POST   /api/admin/commissions

# Notificaciones
POST   /api/admin/notifications/push
POST   /api/admin/notifications/email
GET    /api/admin/notifications

# Estadísticas
GET    /api/admin/stats/dashboard
GET    /api/admin/stats/business/:id
GET    /api/admin/alerts
```

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

## 📦 Producción

### Build Backend
```bash
npm run server:build
```

### Build Frontend (APK Android)
```bash
npm run build:android
```

### Iniciar Producción
```bash
npm run production:start
```

## 🧪 Testing

```bash
# Linting
npm run lint

# Type checking
npm run check:types
```

## 📄 Licencia

Propietario - AstroBar © 2026

## 🆘 Soporte

Para soporte técnico, contacta al equipo de desarrollo.

---

**Hecho con 🌙 en Buenos Aires, Argentina 🇦🇷**
