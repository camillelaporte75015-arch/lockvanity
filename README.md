# 🔒 ua-lockvanity

Protection de vanity URL Discord en temps réel avec réaction ultra-rapide.

## Fonctionnalités
- Verrouillage automatique du vanity URL
- Sanction automatique (ban → kick → suppression des rôles)
- Alerte dans un groupe dédié + salon de logs
- Ping @everyone optionnel sur les alertes
- Anti-group automatique
- Connexion HTTP persistante via `undici` pour un temps de réaction minimal

## Prérequis
- Bun ou Node.js 18+
- VPS idéalement en **US-East** (Hetzner Ashburn recommandé)

## Installation
```bash
git clone https://github.com/toi/ua-lockvanity
cd ua-lockvanity
bun install
cp config.example.toml config.toml
cp .env.example .env
# Remplir config.toml et .env
bun index.ts
