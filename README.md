# AI Chatbot

Ce depot est organise en mode monorepo avec deux dossiers principaux :

- `frontend/` : application Angular
- `backend/` : API Spring Boot

## Structure

```text
.
|-- README.md
|-- frontend/
`-- backend/
```

## Lancer le backend

```bash
cd backend
./mvnw spring-boot:run
```

Sous Windows, vous pouvez aussi utiliser :

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Le backend attend un fichier `backend/.env` avec :

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Lancer le frontend

```bash
cd frontend
npm install
npm start
```

Le frontend tourne sur `http://localhost:4200` et le proxy `/api` pointe vers `http://localhost:8080`.
