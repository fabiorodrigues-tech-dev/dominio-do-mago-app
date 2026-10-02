<p align="center">
  <img src="caminho/para/sua/logo.png" width="200" alt="Logo Domínio do Mago">
</p>

# 🔮 Domínio do Mago - Elemental Arcane UI

![React](https://img.shields.io/badge/React-19.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0-purple?style=for-the-badge&logo=vite)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-brown?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-Glassmorphism-cyan?style=for-the-badge&logo=tailwind-css)
![Three.js](https://img.shields.io/badge/React_Three_Fiber-3D-black?style=for-the-badge&logo=three.js)

O **Domínio do Mago** é uma aplicação de produtividade gamificada (RPG) estruturada numa arquitetura mobile-first. Transforma a gestão de hábitos, rotinas e projetos numa experiência imersiva de evolução mágica e elemental.

## 🏛 Arquitetura Técnica

O projeto utiliza uma stack moderna focada em performance e imersão visual:
*   **Core:** React 19 + TypeScript empacotado via Vite.
*   **State Management:** Zustand para gestão global previsível (Stamina, XP, Prana, Hábitos).
*   **Backend & Auth:** Supabase (PostgreSQL + GoTrue) com sincronização na nuvem.
*   **Engine 3D:** React Three Fiber (R3F) e Drei para renderização procedural do Avatar (Mago) e proteção contra `WebGL Context Lost`.
*   **Design System:** Tailwind CSS com Design Tokens customizados de Glassmorphism Premium (Elemental Arcane UI) e Radix UI (Shadcn) para componentes acessíveis.
*   **Animações:** Framer Motion e SVGs dinâmicos.

## 🗺 Funcionalidades Atuais (Core)

*   **Santuário (Hub):** Dashboard principal no formato HUD de RPG, com métricas vitais (HP, Stamina, Prana) e balanceamento elemental.
*   **Rituais & Hábitos:** Sistema de tracking diário com cálculo de streaks, multiplicadores de XP e recompensas baseadas na assiduidade.
*   **Cassino Arcano (Fase 5):** Roleta de atividades SVG funcional movida a *Stamina* real. O usuário aposta energia para sortear seu destino, tarefas e jackpots de XP.
*   **Domínios & Pilares:** Mapeamento de evolução pessoal (Yoga, Calistenia, Astrolábio, Temporal).
*   **Sistema Temporal:** Gestão de calendários, ciclos, meses e jornadas a longo prazo.
*   **Avatar 3D Dinâmico:** Modelo WebGL que reage aos atributos (Prana) do utilizador no hub principal.

## 🎨 Roadmap de UI/UX (Foco Atual)

A aplicação está a atravessar uma refatoração total para a "Elemental Arcane UI".
- [x] Transição de layout Desktop pesado para App Shell Mobile-First (`MobileBottomNav`).
- [x] Implementação de Design Tokens e Glassmorphism (`.glass-card`) contextual.
- [x] Criação da UI e mecânica do Cassino Arcano.
- [ ] **Fix:** Correção de Props no Radix UI Select nos formulários de invocação (Tratamento de *empty strings*).
- [ ] **Fix & Polimento 3D:** Estabilização do ciclo de vida do Avatar 3D (`useGLTF`) nas rotas do R3F, garantindo transições de abas sem ecrã preto.
- [ ] **Acessibilidade:** Suporte total a teclado e Screen Readers nos modais e menus de navegação inferior.

## 🚀 Como Executar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/fabiorodrigues-tech-dev/dominio-do-mago-app.git
cd dominio-do-mago-app
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### Supabase Auth (Opcional)

1. Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```
2. Configure `VITE_ENABLE_SUPABASE_AUTH=true` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Execute o SQL de migração em `supabase/migrations/20260319_init_auth_and_user_data.sql`.
