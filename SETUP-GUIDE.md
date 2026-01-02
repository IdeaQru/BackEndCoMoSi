# 🚀 PHOTOSENSOR BACKEND - AUTO SETUP GUIDE

## ⚡ SUPER QUICK START (5 MENIT)

### Option 1: Automated Setup (Recommended)

```bash
# 1. Run setup generator
node setup.js

# 2. Install dependencies
npm install

# 3. Setup database
createdb photosensor_db
psql -U postgres -d photosensor_db -f database.sql

# 4. Configure
cp .env.example .env
# Edit .env: ubah PLC_IP dan DB_PASSWORD

# 5. Copy remaining files
# Copy dari backend-files-part1.js, services.js, part2.js
# ke folder src/ yang sudah dibuat (lihat instruksi di bawah)

# 6. Run!
npm run dev

# ✨ Backend jalan di http://localhost:3000
```

### Option 2: Manual Setup

Jika automated setup tidak work:

```bash
# 1. Create folder manually
mkdir photosensor-backend
cd photosensor-backend

# 2. Initialize npm
npm init -y
npm install express cors dotenv pg socket.io axios winston omron-fins
npm install --save-dev nodemon

# 3. Create folder structure
mkdir -p src/{config,controllers,services,models,routes,middleware,utils,integration}
mkdir logs

# 4. Copy all files dari 3 JavaScript files
# - backend-files-part1.js
# - backend-files-services.js  
# - backend-files-part2.js
# (Ikuti instruksi mapping di bawah)

# 5. Rest of setup sama seperti Option 1 (langkah 3-6)
```

---

## 📋 MAPPING FILES - COPY DARI MANA?

### Dari `backend-files-part1.js` copy ke:

```
✓ server.js
✓ src/app.js
✓ package.json
✓ src/config/environment.js
✓ src/config/database.js
✓ src/config/fins.js
✓ src/utils/constants.js
✓ src/utils/helpers.js
✓ src/utils/logger.js
✓ src/middleware/logger.js
✓ src/middleware/errorHandler.js
✓ src/middleware/authMiddleware.js
```

### Dari `backend-files-services.js` copy ke:

```
✓ src/services/finsService.js ⭐ CRITICAL
✓ src/services/sensorService.js
✓ src/services/dataService.js
✓ src/services/websocketService.js
✓ src/services/pollingService.js ⭐ CRITICAL
```

### Dari `backend-files-part2.js` copy ke:

```
✓ src/integration/plcIntegration.js ⭐⭐ VERY CRITICAL
✓ src/controllers/sensorController.js
✓ src/controllers/systemController.js
✓ src/models/Sensor.js
✓ src/models/SensorEvent.js
✓ src/models/SystemConfig.js
✓ src/routes/index.js
✓ src/routes/sensorRoutes.js
✓ src/routes/systemRoutes.js
✓ database.sql
✓ .env.example
✓ .gitignore
```

---

## 🎯 STEP-BY-STEP COPY INSTRUKSI

### Langkah 1: Buka `backend-files-part1.js`

Cari text: `=== SECTION START: server.js ===`

Copy semuanya hingga sebelum `=== SECTION START: src/app.js ===`

Paste ke file `server.js`

### Langkah 2: Lanjutkan dengan bagian berikutnya

Cari: `=== SECTION START: src/app.js ===`

Copy hingga sebelum bagian berikutnya

Paste ke `src/app.js`

### Langkah 3: Ulangi untuk semua file

Setiap section ada pattern:
```
=== SECTION START: [FILENAME] ===
[KODE DISINI]
```

Copy dari pattern tersebut ke file yang sesuai

---

## ✅ VERIFICATION CHECKLIST

Setelah setup, verify dengan:

```bash
# 1. Check jika folders sudah ada
ls -la src/

# 2. Check jika files sudah complete
ls -la src/config/
ls -la src/services/
ls -la src/controllers/

# 3. Check npm dependencies installed
npm list express pg socket.io

# 4. Check database
createdb photosensor_db  # Create if not exist
psql -U postgres -d photosensor_db -c "SELECT COUNT(*) FROM sensor_logs;"

# 5. Check environment file
cat .env

# 6. Check PLC connection
ping 192.168.1.100

# 7. Try running
npm run dev

# Expected output:
# Server running on port 3000
# Database connected
# Polling service started
```

---

## 🐛 TROUBLESHOOTING

### Error: "Cannot find module 'express'"
```bash
Solution: npm install
```

### Error: "EADDRINUSE :::3000"
```bash
Solution: lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9
atau gunakan port lain: SERVER_PORT=3001 npm run dev
```

### Error: "Database does not exist"
```bash
Solution: 
createdb photosensor_db
psql -U postgres -d photosensor_db -f database.sql
```

### Error: "Cannot connect to PLC"
```bash
Solution:
1. Check PLC IP di .env: PLC_IP=192.168.1.100
2. Ping: ping 192.168.1.100
3. Telnet: telnet 192.168.1.100 9600
4. Check PLC program sudah upload
```

### Error: "PLC Polling not starting"
```bash
Solution:
1. Check logs: tail -f logs/error.log
2. Check PlcIntegration di server.js
3. Verify finsService initialized
4. Check FINS port 9600 open
```

---

## 📊 FINAL STRUCTURE

Setelah selesai, Anda punya:

```
photosensor-backend/
├── server.js                    ← Entry point
├── package.json                 ← Dependencies
├── .env                         ← Configuration (create dari .env.example)
├── .env.example                 ← Template
├── .gitignore                   ← Git ignore
├── database.sql                 ← Database schema
├── logs/                        ← Auto-created at runtime
└── src/
    ├── app.js                   ← Express app
    ├── config/
    │   ├── environment.js       ← Env loader
    │   ├── database.js          ← DB pool
    │   └── fins.js              ← FINS config
    ├── utils/
    │   ├── constants.js         ← Constants
    │   ├── helpers.js           ← Helpers
    │   └── logger.js            ← Logger
    ├── middleware/
    │   ├── logger.js            ← Request logger
    │   ├── errorHandler.js      ← Error handler
    │   └── authMiddleware.js    ← Validation
    ├── services/
    │   ├── finsService.js       ← FINS comm ⭐
    │   ├── sensorService.js     ← Sensor logic
    │   ├── dataService.js       ← Database ops
    │   ├── websocketService.js  ← WebSocket
    │   └── pollingService.js    ← Polling ⭐
    ├── integration/
    │   └── plcIntegration.js    ← PLC manager ⭐⭐
    ├── controllers/
    │   ├── sensorController.js
    │   └── systemController.js
    ├── models/
    │   ├── Sensor.js
    │   ├── SensorEvent.js
    │   └── SystemConfig.js
    └── routes/
        ├── index.js
        ├── sensorRoutes.js
        └── systemRoutes.js

Total: 28+ Files, 3000+ Lines of Code ✅
```

---

## 🎉 SUCCESS INDICATORS

Backend berhasil jika Anda bisa:

```bash
✅ npm run dev - tidak ada error
✅ curl http://localhost:3000/health - returns OK
✅ curl http://localhost:3000/api/v1/sensors/current - returns data
✅ logs show "Polling service started"
✅ Database punya entries di sensor_logs
✅ WebSocket bisa connect dari browser

Jika semua ✅ = SELESAI! 🚀
```

---

## 🚀 NEXT STEPS

1. ✅ Backend setup (DONE)
2. 🔄 Frontend Angular (NEXT)
3. 📦 Deployment
4. 📊 Monitoring

---

## 📞 SUPPORT

Kalau ada error:
1. Check logs: `tail -f logs/error.log`
2. Check .env configuration
3. Verify PLC connection: `ping 192.168.1.100`
4. Check database: `psql -U postgres -d photosensor_db`
5. Review code comments di setiap file

---

**Selamat setup! Backend siap digunakan! 🎯**
