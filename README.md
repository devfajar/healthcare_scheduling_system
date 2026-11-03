# Healthcare Scheduling System - Auth Service

Sistem penjadwalan layanan kesehatan berbasis arsitektur **Microservices** modern menggunakan **NestJS**, **PostgreSQL**, **GraphQL (Apollo Server)**, **Prisma ORM**, dan **Docker & Docker Compose**.

Layanan ini adalah **Auth Microservice** yang beroperasi pada **Port 3001**, bertanggung jawab penuh atas manajemen identitas pengguna, autentikasi, dan validasi token untuk seluruh layanan lain di dalam ekosistem.

---

## 🏛️ 1. Arsitektur Sistem

```mermaid
flowchart TD
    Client["Client / Frontend / Gateway"]
    AuthService["Auth Microservice (Port 3001)\nNestJS + GraphQL + REST"]
    PostgresDB[("PostgreSQL Database\nhealthcare_auth")]
    OtherServices["Other Microservices\n(Schedule / Doctor / Patient)"]

    %% User Flows
    Client -->|"1. GraphQL: register & login"| AuthService
    Client -->|"2. GraphQL: query me (Bearer Token)"| AuthService

    %% Inter-service Flow
    OtherServices -->|"3. HTTP POST: /auth/validate\natau GraphQL validateToken"| AuthService

    %% Database Flow
    AuthService -->|"Prisma ORM (PostgreSQL Adapter)"| PostgresDB
```

### Penjelasan Komponen Arsitektur:
1. **Client / Gateway**: Mengirimkan request registrasi, login, dan query profil (`me`) melalui GraphQL Endpoint (`http://localhost:3001/graphql`).
2. **Auth Microservice (`port 3001`)**:
   - Menerima dan memproses otentikasi.
   - Meng-hash password menggunakan `bcrypt` sebelum disimpan.
   - Menerbitkan JWT Access Token dengan masa kedaluwarsa yang wajar (`1d`).
   - Menyediakan query GraphQL `validateToken` serta endpoint REST `POST /auth/validate` untuk validasi token berkecepatan tinggi antar service.
3. **PostgreSQL Database (`port 5432`)**: Menyimpan entitas `User` dengan skema UUID, email unik, dan password ter-hash.
4. **Other Microservices**: Layanan lain dalam ekosistem (misal: Schedule Service) cukup memanggil endpoint `validateToken` untuk memverifikasi hak akses pengguna tanpa perlu mengakses database autentikasi secara langsung.

---

## 🔑 2. List Environment Variables

Seluruh data sensitif dan konfigurasi dinamis disimpan di file `.env` dan **tidak di-commit ke Git** (dilindungi oleh `.gitignore`). File template disediakan di [`.env.example`](file:///.env.example).

| Variable Name | Tipe | Default / Rekomendasi | Deskripsi & Keamanan |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `3001` | Port aplikasi Auth Microservice. |
| `NODE_ENV` | String | `development` / `production` | Mode runtime aplikasi. |
| `CORS_ORIGIN` | String | `*` / `http://localhost:3000` | Asal frontend yang diizinkan (CORS). Pisahkan dengan koma jika lebih dari satu. |
| `DATABASE_URL` | String | `postgresql://postgres:postgres@localhost:5432/healthcare_auth?schema=public` | **Sensitif**. Connection string database PostgreSQL yang digunakan oleh Prisma ORM. |
| `JWT_SECRET` | String | *(Kunci rahasia minimal 32 karakter)* | **Sangat Sensitif**. Secret key kriptografis untuk menandatangani (*sign*) dan memverifikasi token JWT. |
| `JWT_EXPIRES_IN`| String | `1d` | Masa aktif token JWT yang wajar (contoh: `1d` = 24 jam). |
| `POSTGRES_USER` | String | `postgres` | Username database PostgreSQL (Docker Compose). |
| `POSTGRES_PASSWORD`| String | `postgres` | **Sensitif**. Password database PostgreSQL (Docker Compose). |
| `POSTGRES_DB` | String | `healthcare_auth` | Nama database utama untuk service autentikasi. |

---

## 🚀 3. Cara Menjalankan Project

### Opsi A: Menggunakan Docker & Docker Compose (Direkomendasikan)

Pastikan Docker & Docker Compose sudah terinstal di sistem Anda.

1. **Salin file environment dari template:**
   ```bash
   cp .env.example .env
   cp auth-service/.env.example auth-service/.env
   ```

2. **Jalankan container dengan Docker Compose:**
   ```bash
   docker compose up -d --build
   ```
   *(atau gunakan `sudo docker compose up -d --build` jika memerlukan izin akses)*

3. **Cek status container:**
   ```bash
   docker compose ps
   ```

4. **Akses Layanan:**
   - **GraphQL Playground / Apollo Sandbox**: [http://localhost:3001/graphql](http://localhost:3001/graphql)
   - **REST Health Check**: [http://localhost:3001/auth/health](http://localhost:3001/auth/health)
   - **REST Validate Token**: [http://localhost:3001/auth/validate](http://localhost:3001/auth/validate)

5. **Menghentikan container:**
   ```bash
   docker compose down
   ```

---

### Opsi B: Menjalankan Secara Lokal (Development Mode)

1. **Masuk ke folder `auth-service`:**
   ```bash
   cd auth-service
   ```

2. **Salin file konfigurasi environment:**
   ```bash
   cp .env.example .env
   ```
   *Pastikan PostgreSQL lokal Anda aktif dan nilai `DATABASE_URL` sudah sesuai.*

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Sinkronisasi skema database dengan Prisma:**
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```

5. **Jalankan service:**
   ```bash
   npm run start:dev
   ```

6. **Menjalankan Unit Tests (46 test cases):**
   ```bash
   npm test
   ```

---

## 📡 4. Contoh GraphQL Queries & Mutations

Buka GraphQL Playground di [http://localhost:3001/graphql](http://localhost:3001/graphql).

### A. Registrasi Pengguna Baru (`Mutation.register`)
```graphql
mutation RegisterUser {
  register(input: {
    email: "dr.fajar@test.com"
    password: "SecurePassword123!"
  }) {
    accessToken
    user {
      id
      email
      createdAt
      updatedAt
    }
  }
}
```

**Contoh Response Sukses:**
```json
{
  "data": {
    "register": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e4f8d591-1b83-4a12-87db-2bc250953bf6",
        "email": "dr.fajar@test.com",
        "createdAt": "2026-11-03T10:15:30.000Z",
        "updatedAt": "2026-11-03T10:15:30.000Z"
      }
    }
  }
}
```

---

### B. Login Pengguna (`Mutation.login`)
```graphql
mutation LoginUser {
  login(input: {
    email: "dr.fajar@test.com"
    password: "SecurePassword123!"
  }) {
    accessToken
    user {
      id
      email
      createdAt
      updatedAt
    }
  }
}
```

**Contoh Response Sukses:**
```json
{
  "data": {
    "login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e4f8d591-1b83-4a12-87db-2bc250953bf6",
        "email": "dr.fajar@test.com",
        "createdAt": "2026-11-03T10:15:30.000Z",
        "updatedAt": "2026-11-03T10:15:30.000Z"
      }
    }
  }
}
```

---

### C. Validasi Token via GraphQL (`Query.validateToken`)
Dipanggil oleh client atau gateway untuk memvalidasi token dan mengambil data profil:
```graphql
query ValidateToken {
  validateToken(input: {
    token: "<MASUKKAN_JWT_ACCESS_TOKEN_DI_SINI>"
  }) {
    isValid
    message
    user {
      id
      email
      createdAt
      updatedAt
    }
  }
}
```

**Contoh Response (Token Valid):**
```json
{
  "data": {
    "validateToken": {
      "isValid": true,
      "message": "Token is valid",
      "user": {
        "id": "e4f8d591-1b83-4a12-87db-2bc250953bf6",
        "email": "dr.fajar@test.com",
        "createdAt": "2026-11-03T10:15:30.000Z",
        "updatedAt": "2026-11-03T10:15:30.000Z"
      }
    }
  }
}
```

---

### D. Profil Pengguna yang Sedang Login (`Query.me`)
Memerlukan HTTP Header: `Authorization: Bearer <MASUKKAN_JWT_ACCESS_TOKEN>`:
```graphql
query CurrentUser {
  me {
    id
    email
    createdAt
    updatedAt
  }
}
```

---

## 🔗 5. Validasi Token oleh Microservice Lain (REST Endpoint)

Untuk kemudahan integrasi antar microservice (*inter-service communication*) tanpa dependensi client GraphQL yang berat, disediakan endpoint REST berkecepatan tinggi:

### Request via JSON Body:
```bash
curl -X POST http://localhost:3001/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "<MASUKKAN_JWT_ACCESS_TOKEN>"}'
```

### Request via Authorization Header:
```bash
curl -X POST http://localhost:3001/auth/validate \
  -H "Authorization: Bearer <MASUKKAN_JWT_ACCESS_TOKEN>"
```

**Response Sukses (HTTP 200 OK):**
```json
{
  "isValid": true,
  "message": "Token is valid",
  "user": {
    "id": "e4f8d591-1b83-4a12-87db-2bc250953bf6",
    "email": "dr.fajar@test.com",
    "createdAt": "2026-11-03T10:15:30.000Z",
    "updatedAt": "2026-11-03T10:15:30.000Z"
  }
}
```

**Response Jika Token Kedaluwarsa / Tidak Sah (HTTP 200 OK):**
```json
{
  "isValid": false,
  "message": "jwt expired",
  "user": null
}
```

---

## 📬 6. Postman Collection untuk Testing

File koleksi Postman telah disediakan di root repository:
[`healthcare_scheduling_auth.postman_collection.json`](file:///healthcare_scheduling_auth.postman_collection.json)

### Fitur Otomatisasi Postman:
1. **Auto Token Injection**: Ketika Anda mengeksekusi request **Register** atau **Login**, script post-response otomatis menyimpan nilai `accessToken` ke variabel koleksi `{{auth_token}}`.
2. **Instant Testing**: Request berikutnya (**Validate Token**, **Me**, **REST Validate**) akan langsung menggunakan `{{auth_token}}` secara otomatis tanpa perlu copy-paste manual.

### Cara Import ke Postman:
1. Buka aplikasi **Postman**.
2. Klik tombol **Import** (di pojok kiri atas).
3. Pilih file `healthcare_scheduling_auth.postman_collection.json`.
4. Koleksi langsung siap digunakan!

---
