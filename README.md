# Sistema de Gestión Policial

Aplicación web para la gestión de datos de oficiales de policía, desarrollada con Node.js, Express, MySQL y una interfaz web moderna con HTML, CSS y JavaScript puro.

## Características

- Autenticación de usuarios
- Registro de datos generales de oficiales de policía
- Búsqueda de oficiales por nombre
- Almacenamiento de documentos PDF
- Interfaz moderna y responsiva
- Módulo de evaluaciones

## Requisitos Previos (Desarrollo Local)

1. Node.js (v14 o superior) instalado
2. MySQL Server o MySQL Workbench instalado
3. Navegador web moderno (Chrome, Firefox, Edge, etc.)
4. Cuenta en [Render](https://render.com)

## Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd POLICIAS
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configuración del entorno**
   - Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
     ```
     DB_HOST=localhost
     DB_USER=tu_usuario
     DB_PASSWORD=tu_contraseña
     DB_NAME=sistema_policial
     DB_PORT=3306
     PORT=8080
     ```

4. **Configuración de la Base de Datos**
   - Abre MySQL Workbench
   - Conéctate a tu servidor MySQL
   - Ejecuta el script `database.sql` para crear la base de datos y las tablas necesarias

3. **Credenciales de Acceso**
   - Usuario: admin
   - Contraseña: admin

## Estructura del Proyecto

```
POLICIAS/
├── css/
│   └── style.css          # Estilos de la aplicación
├── js/
│   └── app.js            # Lógica de la aplicación
├── index.html            # Página principal
├── database.sql          # Script de la base de datos
└── README.md             # Este archivo
```

## Despliegue en Render

### 1. Preparar el repositorio

1. Crea un repositorio en GitHub y sube tu código:
   ```bash
   git init
   git add .
   git commit -m "Primer commit"
   git branch -M main
   git remote add origin [URL_DEL_REPOSITORIO]
   git push -u origin main
   ```

### 2. Desplegar en Render

1. Inicia sesión en tu cuenta de [Render](https://render.com)
2. Haz clic en "New" y selecciona "Web Service"
3. Conecta tu cuenta de GitHub y selecciona el repositorio
4. Configura el servicio web:
   - **Name**: sistema-policial
   - **Region**: Selecciona la más cercana
   - **Branch**: main
   - **Build Command**: npm install
   - **Start Command**: npm start
5. En la sección de variables de entorno, agrega las siguientes variables (Render configurará automáticamente las de la base de datos):
   - `NODE_ENV`: production
   - `PORT`: 10000
6. Haz clic en "Create Web Service"

### 3. Configurar la base de datos en Render

1. En el panel de Render, haz clic en "New" y selecciona "PostgreSQL"
2. Configura la base de datos:
   - **Name**: sistema-policial-db
   - **Database**: sistema_policial
   - **User**: admin
   - **Plan**: Free
3. Una vez creada, ve a la pestaña "Connections" y copia la cadena de conexión externa
4. Ve a tu servicio web, luego a la pestaña "Environment"
5. Actualiza las variables de entorno con la información de conexión de la base de datos

### 4. Importar la base de datos

1. Obtén la cadena de conexión externa de tu base de datos en Render
2. Usa MySQL Workbench o la herramienta que prefieras para conectarte a la base de datos remota
3. Ejecuta el script `database.sql` para crear las tablas necesarias

## Uso Local

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
2. Abre tu navegador en `http://localhost:8080`

## Acceso

- **URL de producción**: [URL_DEL_SITIO_EN_RENDER] (se actualizará después del despliegue)
- **Usuario de prueba**: admin
- **Contraseña de prueba**: admin
2. Abre un navegador y ve a `http://localhost/POLICIAS`
3. Inicia sesión con las credenciales proporcionadas
4. Navega por las diferentes secciones del sistema

### Registro de Oficiales

1. Ve a la pestaña "Datos Generales"
2. Completa el formulario con los datos del oficial
3. Adjunta el archivo PDF si es necesario
4. Haz clic en "Guardar"

### Búsqueda de Oficiales

1. En la sección de búsqueda, ingresa el nombre del oficial
2. Haz clic en "Buscar" o presiona Enter
3. Los resultados se mostrarán debajo del campo de búsqueda
4. Para ver el PDF de un oficial, haz clic en "Ver PDF"

## Notas Importantes

- Esta es una versión de demostración con almacenamiento en localStorage del navegador.
- Para producción, se recomienda implementar un backend seguro para manejar la autenticación y el almacenamiento de archivos.
- La contraseña del administrador debe cambiarse después de la primera instalación.

## Seguridad

- Nunca expongas este sistema directamente a Internet sin las medidas de seguridad adecuadas
- Cambia las contraseñas por defecto
- Mantén el sistema actualizado
- Realiza copias de seguridad periódicas de la base de datos

## Soporte

Para soporte técnico, por favor contacta al administrador del sistema.
