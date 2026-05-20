<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">NestJS + Drizzle + AWS Init</h1>

<p align="center">
  Boilerplate de backend serverless con <strong>NestJS</strong>, <strong>Drizzle ORM</strong> y servicios de <strong>AWS</strong>, emulados localmente con <strong>Floci</strong> (fork de LocalStack).
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <img src="https://img.shields.io/badge/runtime-Node.js%2020-green" alt="Node 20" />
  <img src="https://img.shields.io/badge/ORM-Drizzle-blue" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/cloud-AWS-orange" alt="AWS" />
  <img src="https://img.shields.io/badge/local-Floci-purple" alt="Floci" />
</p>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Arquitectura AWS con Floci](#-arquitectura-aws-con-floci)
- [Diagrama de Servicios](#-diagrama-de-servicios)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Variables de Entorno](#-variables-de-entorno)
- [Guía Completa de Floci](#-guía-completa-de-floci)
- [Configuración e Instalación](#-configuración-e-instalación)
- [Despliegue](#-despliegue)
- [Scripts Disponibles](#-scripts-disponibles)
- [Licencia](#-licencia)

---

## 📖 Descripción

Este proyecto es un **boilerplate serverless** diseñado para desarrollar y desplegar aplicaciones backend con el framework **NestJS**, usando **Drizzle ORM** para la capa de persistencia sobre PostgreSQL y un conjunto de servicios de **AWS** que se emulan localmente mediante **Floci**.

### Características principales

- ⚡ **NestJS 11** — Framework progresivo de Node.js para aplicaciones escalables
- 🗄️ **Drizzle ORM** — ORM ligero y type-safe para PostgreSQL
- ☁️ **AWS Lambda** — Despliegue serverless con API Gateway (`{proxy+}`)
- 📦 **Amazon S3** — Almacenamiento de objetos (documentos, archivos)
- 🐘 **Amazon RDS (PostgreSQL)** — Base de datos relacional gestionada
- 🔴 **ElastiCache (Redis)** — Caché y sesiones en memoria
- 🐳 **Floci** — Emulación local completa de servicios AWS con Docker
- 🏗️ **Serverless Framework** — Infraestructura como código con `serverless-localstack`
- 📦 **Docker multi-stage** — Builds optimizados con imagen base `amazon/aws-lambda-nodejs:20`

---

## 🏛️ Arquitectura AWS con Floci

El proyecto utiliza **Floci** como emulador local de servicios AWS. Floci levanta un contenedor Docker único que expone todos los servicios de AWS en el puerto `4566`, junto con puertos dedicados para RDS Proxy (`7001+`), Redis (`6379+`) y ECR.

### Flujo de la aplicación

1. **API Gateway** recibe las peticiones HTTP y las enruta a **Lambda**
2. **AWS Lambda** ejecuta la aplicación NestJS empaquetada en un contenedor Docker (ECR)
3. La app se conecta a **RDS PostgreSQL** (Drizzle ORM) para persistencia
4. **S3** se usa para almacenamiento de archivos y documentos
5. **Redis (ElastiCache)** maneja caché y sesiones
6. Todo corre dentro de la red Docker `floci_default` para comunicación interna

### Entornos

| Entorno | Infra | Configuración |
|---------|-------|---------------|
| **Local (dev)** | Docker Compose directo | `.env` — PostgreSQL + Redis standalone |
| **Local (prod)** | Floci + Docker Compose | `.env.prod` + `env-local.yml` — Servicios AWS emulados |
| **Cloud (AWS)** | AWS nativo | Variables en AWS Systems Manager / Secrets Manager |

---

## 🗺️ Diagrama de Servicios

### Arquitectura General AWS

```mermaid
graph TB
    subgraph Cliente["🌐 Cliente"]
        Browser["Browser / App"]
    end

    subgraph AWS["☁️ AWS Cloud / Floci Local"]
        subgraph Gateway["API Gateway"]
            APIGW["REST API<br/>ANY / & /{proxy+}"]
        end

        subgraph Compute["Compute"]
            Lambda["⚡ AWS Lambda<br/>Node.js 20<br/>NestJS App"]
        end

        subgraph Storage["Storage"]
            S3["📦 Amazon S3<br/>notary-bucket<br/>Documentos & Archivos"]
        end

        subgraph Database["Database"]
            RDS["🐘 Amazon RDS<br/>PostgreSQL 17<br/>Drizzle ORM"]
        end

        subgraph Cache["Cache"]
            Redis["🔴 ElastiCache<br/>Redis 7<br/>Sesiones & Caché"]
        end

        subgraph Container["Container Registry"]
            ECR["📦 Amazon ECR<br/>Docker Images<br/>nestjs-drizzle-aws-init"]
        end
    end

    Browser -->|"HTTPS"| APIGW
    APIGW -->|"Invoke"| Lambda
    Lambda -->|"@aws-sdk/client-s3"| S3
    Lambda -->|"Drizzle ORM / pg"| RDS
    Lambda -->|"ioredis"| Redis
    ECR -.->|"Image Pull"| Lambda

    style AWS fill:#232f3e,color:#fff
    style Gateway fill:#a855f7,color:#fff
    style Compute fill:#f59e0b,color:#000
    style Storage fill:#22c55e,color:#fff
    style Database fill:#3b82f6,color:#fff
    style Cache fill:#ef4444,color:#fff
    style Container fill:#06b6d4,color:#fff
```

### Infraestructura Local con Floci

```mermaid
graph LR
    subgraph Host["🖥️ Máquina Local"]
        subgraph FlociNetwork["Docker Network: floci_default"]
            Floci["🐳 Floci Container<br/>localhost:4566"]
            
            S3L["S3<br/>:4566"]
            RDSL["RDS Postgres<br/>:7001"]
            LambdaL["Lambda<br/>:4566"]
            RedisL["Redis<br/>:6379"]
            ECRL["ECR<br/>:5100"]

            Floci --> S3L
            Floci --> RDSL
            Floci --> LambdaL
            Floci --> RedisL
            Floci --> ECRL
        end

        subgraph App["📱 App Container"]
            NestJS["NestJS App<br/>:3000"]
        end

        NestJS -->|"floci:4566"| S3L
        NestJS -->|"floci:7001"| RDSL
        NestJS -->|"floci:6379"| RedisL
    end

    style FlociNetwork fill:#1e1b4b,color:#fff
    style App fill:#064e3b,color:#fff
    style Floci fill:#7c3aed,color:#fff
```

### Flujo de Despliegue con Serverless

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 Developer
    participant SLS as Serverless Framework
    participant Floci as 🐳 Floci
    participant ECR as ECR
    participant Lambda as Lambda
    participant APIGW as API Gateway

    Dev->>SLS: sls deploy --stage local
    SLS->>Floci: Connect via serverless-localstack
    SLS->>ECR: Push Docker Image
    SLS->>Lambda: Create/Update Function
    SLS->>APIGW: Configure Routes (ANY /, ANY /{proxy+})
    APIGW-->>Dev: Endpoint URL
    
    Note over Lambda: Handler: dist/src/lambda.handler
    Note over Lambda: Runtime: Docker (nodejs20.x)
```

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| **Framework** | NestJS | 11.x | Framework backend principal |
| **Runtime** | Node.js | 20.x | Entorno de ejecución |
| **Package Manager** | Bun | 1.2+ | Gestión de dependencias y builds |
| **ORM** | Drizzle ORM | 0.45.x | Capa de acceso a datos type-safe |
| **Base de Datos** | PostgreSQL | 17 | Persistencia relacional |
| **Caché** | Redis | 7.x | Caché y sesiones |
| **Cloud** | AWS (Lambda, S3, RDS, ECR) | — | Infraestructura cloud |
| **Emulador Local** | Floci | latest | Emulación de AWS local |
| **IaC** | Serverless Framework | 3.x | Infraestructura como código |
| **Contenedores** | Docker | Multi-stage | Empaquetado de la aplicación |
| **Messaging** | AMQP / Kafka / MQTT / NATS / gRPC | — | Comunicación entre microservicios (preparado) |

---

## 📁 Estructura del Proyecto

```
nestjs-drizzle-aws-init/
├── src/
│   ├── main.ts                    # Entry point (desarrollo local)
│   ├── lambda.ts                  # Entry point (AWS Lambda handler)
│   ├── app.module.ts              # Módulo raíz de NestJS
│   ├── app.controller.ts          # Controlador principal
│   ├── app.service.ts             # Servicio principal
│   ├── database/
│   │   ├── database.module.ts     # Módulo de base de datos
│   │   ├── database.service.ts    # Servicio Drizzle + Pool PostgreSQL
│   │   └── migrations/            # Migraciones de Drizzle Kit
│   ├── s3/
│   │   ├── s3.module.ts           # Módulo de S3
│   │   └── s3.service.ts          # Servicio S3 (upload, get, delete, auto-create bucket)
│   └── modules/
│       └── users/                 # Módulo de usuarios (ejemplo)
├── .env                           # Variables de entorno (desarrollo local)
├── .env.example                   # Template de variables de entorno
├── .env.prod                      # Variables de entorno (producción local con Floci)
├── env-local.yml                  # Config para Serverless (stage: local)
├── env-local.template.yml         # Template del env-local.yml
├── serverless.yml                 # Definición de infraestructura Serverless
├── docker-compose.yml             # Postgres + Redis standalone
├── docker-compose.prod.yml        # App container conectado a Floci network
├── Dockerfile                     # Multi-stage build (Bun → Lambda Node.js 20)
├── drizzle.config.ts              # Configuración de Drizzle Kit
├── package.json                   # Dependencias y scripts
└── tsconfig.json                  # Configuración de TypeScript
```

---

## 🔐 Variables de Entorno

### Aplicación General

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|:---------:|
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) | `development` | ✅ |
| `PORT` | Puerto del servidor HTTP | `3000` | ❌ |

### Base de Datos (PostgreSQL / RDS)

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|:---------:|
| `DB_HOST` | Host del servidor PostgreSQL | `localhost` | ✅ |
| `DB_PORT` | Puerto del servidor PostgreSQL | `5432` | ✅ |
| `DB_USER` | Usuario de la base de datos | `postgres` | ✅ |
| `DB_PASSWORD` | Contraseña de la base de datos | — | ✅ |
| `DB_NAME` | Nombre de la base de datos | `notary_db` | ✅ |
| `DATABASE_URL` | Connection string completo para Drizzle ORM | — | ✅ |
| `POSTGRES_USER` | Usuario interno del contenedor PostgreSQL (Docker) | `${DB_USER}` | ❌ |
| `POSTGRES_PASSWORD` | Contraseña interna del contenedor (Docker) | `${DB_PASSWORD}` | ❌ |
| `POSTGRES_DB` | Base de datos interna del contenedor (Docker) | `${DB_NAME}` | ❌ |

### Caché y Sesiones (Redis / ElastiCache)

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|:---------:|
| `REDIS_HOST` | Host del servidor Redis | `localhost` | ✅ |
| `REDIS_PORT` | Puerto del servidor Redis | `6379` | ✅ |
| `REDIS_PASSWORD` | Contraseña de autenticación Redis | — | ✅ |

### AWS / Floci

| Variable | Descripción | Valor por defecto | Requerida |
|----------|-------------|-------------------|:---------:|
| `AWS_ACCESS_KEY_ID` | Access Key de AWS (en Floci usar `test`) | `test` | ✅ |
| `AWS_SECRET_ACCESS_KEY` | Secret Key de AWS (en Floci usar `test`) | `test` | ✅ |
| `AWS_REGION` | Región de AWS | `us-east-1` | ✅ |
| `AWS_S3_ENDPOINT` | Endpoint personalizado de S3 (para Floci: `http://floci:4566`) | — | ❌ |
| `AWS_S3_BUCKET` | Nombre del bucket de S3 | `notary-bucket` | ✅ |

### Referencia rápida por entorno

<details>
<summary><strong>Desarrollo Local (.env)</strong></summary>

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres_secure_password_123
DB_NAME=notary_db
DATABASE_URL=postgresql://postgres:postgres_secure_password_123@localhost:5432/notary_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_456
```

</details>

<details>
<summary><strong>Producción Local con Floci (.env.prod)</strong></summary>

```env
NODE_ENV=production
PORT=3000

# Database (RDS via Floci)
DB_HOST=floci
DB_PORT=7001
DB_USER=admin
DB_PASSWORD=admin
DB_NAME=notary-bd
DATABASE_URL=postgresql://admin:admin@floci:7001/notary-bd

# Redis (via Floci)
REDIS_HOST=floci
REDIS_PORT=6379
REDIS_PASSWORD=redis123$$

# AWS Credentials (Floci)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1

# S3 (via Floci)
AWS_S3_ENDPOINT=http://floci:4566
AWS_S3_BUCKET=notary-bucket
```

</details>

---

## 🚀 Configuración e Instalación

### Prerequisitos

- [Bun](https://bun.sh/) ≥ 1.2
- [Docker](https://www.docker.com/) y Docker Compose
- [Floci](https://github.com/floci/floci) corriendo en Docker (para emulación AWS)

### 1. Clonar el repositorio

```bash
git clone https://github.com/pholguinc/nestjs-drizzle-aws-init.git
cd nestjs-drizzle-aws-init
```

### 2. Instalar dependencias

```bash
bun install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores locales
```

### 4a. Desarrollo local (sin Floci)

```bash
# Levantar PostgreSQL y Redis
docker compose up -d

# Ejecutar migraciones
bun run drizzle-kit push

# Iniciar en modo desarrollo
bun run start:dev
```

### 4b. Desarrollo local con Floci

```bash
# 1. Levantar Floci (desde el directorio de Floci)
cd ~/services/floci && docker compose up -d

# 2. Copiar template de variables Serverless
cp env-local.template.yml env-local.yml
# Editar env-local.yml con tus valores

# 3. Construir y levantar la app conectada a Floci
docker compose -f docker-compose.prod.yml up --build -d

# 4. O desplegar como Lambda local
bun run deploy:local
```

---

## 🚢 Despliegue

### Despliegue local (Floci + Serverless)

```bash
# Despliega a LocalStack/Floci como Lambda + API Gateway
bun run deploy:local
```

Este comando ejecuta `serverless deploy --stage local`, que:
1. Construye la imagen Docker con el Dockerfile multi-stage
2. Sube la imagen a ECR (emulado por Floci)
3. Crea/actualiza la función Lambda con la imagen
4. Configura API Gateway con rutas `ANY /` y `ANY /{proxy+}`

### Despliegue a AWS (Producción)

```bash
# Configurar credenciales AWS reales
export AWS_ACCESS_KEY_ID=<tu-access-key>
export AWS_SECRET_ACCESS_KEY=<tu-secret-key>

# Desplegar a AWS
serverless deploy --stage prod
```

---

## 🐳 Guía Completa de Floci

[Floci](https://github.com/floci-io/floci) es un emulador local de AWS gratuito y open-source (MIT). Reemplaza a LocalStack Community (que dejó de ser gratuito en marzo 2026). Es extremadamente ligero (~90 MB, ~24 ms de arranque) y emula 47 servicios de AWS.

### Paso 1: Clonar el repositorio de Floci

```bash
# Clonar el repositorio oficial de Floci
git clone https://github.com/floci-io/floci.git

# Entrar al directorio
cd floci
```

### Paso 2: Levantar Floci con Docker Compose

El archivo `docker-compose.yml` del proyecto Floci expone los siguientes puertos:

| Puerto(s) | Servicio | Descripción |
|-----------|---------|-------------|
| `4566` | Floci API | Endpoint principal de todos los servicios AWS |
| `6379-6399` | ElastiCache (Redis) | Instancias de Redis emuladas |
| `7001-7099` | RDS Proxy | Bases de datos PostgreSQL/MySQL emuladas |
| `9200-9299` | OpenSearch | Instancias de OpenSearch emuladas |
| `5100+` | ECR Registry | Registro de imágenes Docker |

```bash
# Levantar Floci en background
docker compose up -d

# Verificar que está corriendo
docker compose ps

# Ver los logs (opcional)
docker compose logs -f floci
```

> **⏱️ Nota:** El primer arranque puede tardar unos segundos en descargar la imagen Docker. Los arranques siguientes son casi instantáneos (~24 ms).

### Paso 3: Exportar variables de entorno de AWS

Antes de usar los comandos `aws` CLI contra Floci, exporta estas variables:

```bash
# Credenciales ficticias (Floci acepta cualquier valor no vacío)
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566
```

> **💡 Tip:** Agrega estas líneas a tu `~/.zshrc` o `~/.bashrc` para no tener que exportarlas cada vez:
> ```bash
> # Floci / AWS Local
> alias awslocal='aws --endpoint-url=http://localhost:4566'
> export AWS_ACCESS_KEY_ID=test
> export AWS_SECRET_ACCESS_KEY=test
> export AWS_DEFAULT_REGION=us-east-1
> ```

### Paso 4: Crear la Base de Datos (RDS PostgreSQL)

Floci emula Amazon RDS con contenedores Docker reales de PostgreSQL. Esto te da un motor de base de datos idéntico al de producción.

```bash
# Crear la instancia de RDS PostgreSQL
aws --endpoint-url http://localhost:4566 rds create-db-instance \
  --db-instance-identifier notary-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password admin \
  --allocated-storage 20
```

```bash
# Verificar que la instancia está disponible
aws --endpoint-url http://localhost:4566 rds describe-db-instances \
  --db-instance-identifier notary-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint}'
```

La salida mostrará el endpoint y puerto asignado (generalmente `7001`):

```json
{
  "Status": "available",
  "Endpoint": {
    "Address": "localhost",
    "Port": 7001
  }
}
```

Una vez disponible, crea la base de datos de la aplicación:

```bash
# Conectarse al PostgreSQL emulado y crear la base de datos
PGPASSWORD=admin psql -h localhost -p 7001 -U admin -d postgres -c "CREATE DATABASE \"notary-bd\";"

# Verificar que la base de datos fue creada
PGPASSWORD=admin psql -h localhost -p 7001 -U admin -d postgres -c "\\l" | grep notary
```

### Paso 5: Crear el Bucket de S3

El `S3Service` del proyecto crea el bucket automáticamente al iniciar la app (`onModuleInit`), pero también puedes crearlo manualmente:

```bash
# Crear el bucket de S3
aws --endpoint-url http://localhost:4566 s3 mb s3://notary-bucket

# Verificar que el bucket existe
aws --endpoint-url http://localhost:4566 s3 ls
```

Operaciones adicionales con S3:

```bash
# Subir un archivo de prueba
echo "test content" > /tmp/test.txt
aws --endpoint-url http://localhost:4566 s3 cp /tmp/test.txt s3://notary-bucket/test.txt

# Listar archivos en el bucket
aws --endpoint-url http://localhost:4566 s3 ls s3://notary-bucket/

# Descargar un archivo
aws --endpoint-url http://localhost:4566 s3 cp s3://notary-bucket/test.txt /tmp/downloaded.txt
```

### Paso 6: Crear el Servicio de ElastiCache (Redis)

Floci emula ElastiCache con un contenedor Docker real de Redis/Valkey:

```bash
# Crear un cluster de ElastiCache (Redis)
aws --endpoint-url http://localhost:4566 elasticache create-cache-cluster \
  --cache-cluster-id notary-cache \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1

# Verificar el estado del cluster
aws --endpoint-url http://localhost:4566 elasticache describe-cache-clusters \
  --cache-cluster-id notary-cache
```

Puedes conectarte directamente a Redis en `localhost:6379`:

```bash
# Probar conexión a Redis
redis-cli -h localhost -p 6379 ping
# Respuesta esperada: PONG
```

### Paso 7: Verificar todos los servicios

Script rápido para verificar que todo está funcionando:

```bash
#!/bin/bash
echo "🔍 Verificando servicios de Floci..."
echo "========================================"

# S3
echo -n "📦 S3: "
aws --endpoint-url http://localhost:4566 s3 ls &>/dev/null && echo "✅ OK" || echo "❌ ERROR"

# RDS
echo -n "🐘 RDS: "
aws --endpoint-url http://localhost:4566 rds describe-db-instances &>/dev/null && echo "✅ OK" || echo "❌ ERROR"

# ElastiCache
echo -n "🔴 ElastiCache: "
aws --endpoint-url http://localhost:4566 elasticache describe-cache-clusters &>/dev/null && echo "✅ OK" || echo "❌ ERROR"

# Lambda
echo -n "⚡ Lambda: "
aws --endpoint-url http://localhost:4566 lambda list-functions &>/dev/null && echo "✅ OK" || echo "❌ ERROR"

# ECR
echo -n "📦 ECR: "
aws --endpoint-url http://localhost:4566 ecr describe-repositories &>/dev/null && echo "✅ OK" || echo "❌ ERROR"

echo "========================================"
echo "✨ Verificación completa"
```

### Resumen de servicios creados

```mermaid
flowchart TD
    subgraph Floci["🐳 Floci - localhost:4566"]
        RDS["🐘 RDS PostgreSQL\nnotary-db\nlocalhost:7001"]
        S3["📦 S3\nnotary-bucket\nlocalhost:4566"]
        Redis["🔴 ElastiCache Redis\nnotary-cache\nlocalhost:6379"]
        ECR["📦 ECR Registry\nlocalhost:5100"]
        Lambda["⚡ Lambda\nnestjs-drizzle-aws-init"]
        APIGW["🌐 API Gateway\nANY / + ANY /{proxy+}"]
    end

    subgraph App["📱 NestJS App"]
        DB["DatabaseService\nDrizzle ORM"]
        S3Svc["S3Service\n@aws-sdk/client-s3"]
        CacheSvc["CacheService\nioredis"]
    end

    DB -->|"postgresql://admin:admin@floci:7001/notary-bd"| RDS
    S3Svc -->|"http://floci:4566"| S3
    CacheSvc -->|"floci:6379"| Redis
    APIGW --> Lambda
    ECR -.->|"Docker Image"| Lambda

    style Floci fill:#1e1b4b,color:#fff
    style App fill:#064e3b,color:#fff
```

### Comandos útiles de Floci

| Acción | Comando |
|--------|--------|
| Iniciar Floci | `docker compose up -d` |
| Detener Floci | `docker compose down` |
| Ver logs | `docker compose logs -f floci` |
| Listar buckets S3 | `aws --endpoint-url http://localhost:4566 s3 ls` |
| Listar instancias RDS | `aws --endpoint-url http://localhost:4566 rds describe-db-instances` |
| Listar funciones Lambda | `aws --endpoint-url http://localhost:4566 lambda list-functions` |
| Listar repositorios ECR | `aws --endpoint-url http://localhost:4566 ecr describe-repositories` |
| Estado de ElastiCache | `aws --endpoint-url http://localhost:4566 elasticache describe-cache-clusters` |

> **📚 Documentación completa:** [https://floci.io/floci/](https://floci.io/floci/)

---

## 📜 Scripts Disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `start` | `bun run start` | Inicia la aplicación |
| `start:dev` | `bun run start:dev` | Inicia en modo watch (desarrollo) |
| `start:debug` | `bun run start:debug` | Inicia en modo debug con watch |
| `start:prod` | `bun run start:prod` | Inicia en modo producción |
| `build` | `bun run build` | Compila el proyecto |
| `lint` | `bun run lint` | Ejecuta ESLint con auto-fix |
| `format` | `bun run format` | Formatea el código con Prettier |
| `test` | `bun run test` | Ejecuta tests unitarios |
| `test:watch` | `bun run test:watch` | Tests en modo watch |
| `test:cov` | `bun run test:cov` | Tests con reporte de cobertura |
| `test:e2e` | `bun run test:e2e` | Tests end-to-end |
| `deploy:local` | `bun run deploy:local` | Despliega a Floci/LocalStack |

---

## 📄 Licencia

Este proyecto está bajo la licencia [UNLICENSED](LICENSE).
