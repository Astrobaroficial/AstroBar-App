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

## ⚙️ Límites Técnicos MVP

- 🏢 Máximo 100 bares activos
- 🍽️ Máximo 80 productos por bar
- 📸 Máximo 80 imágenes por bar
- 🎁 Máximo 10 promociones comunes activas por bar
- ⚡ Máximo 3 promociones flash activas por bar
- 🖼️ Imágenes: max 1200px, 200-400kb, WebP/JPG

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

## 💳 Sistema de Pagos

### Comisiones
- **Bar**: 70% del precio de la promoción
- **Plataforma AstroBar**: 30% del precio de la promoción

### Flujo de Pago
1. Usuario acepta promoción y paga con tarjeta (Stripe)
2. Pago procesado y split automático (70/30)
3. Usuario recibe QR code único
4. Usuario tiene 60 segundos para cancelar
5. Bar escanea QR para validar y entregar
6. Usuario gana 10 puntos automáticamente

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
- 💰 Recibir 70% de cada venta automáticamente

## 🔐 Seguridad

- ✅ Validación de edad +18 años obligatoria
- 🔑 JWT con refresh tokens
- 💳 Pagos seguros con Stripe (PCI compliant)
- ⏱️ QR codes con expiración
- 🚫 Cancelación de 60 segundos
- 🔒 Autenticación por roles (usuario/bar/admin)
- 📝 Auditoría de transacciones

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
