# 🥗 Nutrition Tracker

Application de suivi nutritionnel et de dépense énergétique, construite avec React + Vite.

## Fonctionnalités

- **Profil utilisateur** — calcul automatique du BMR, TDEE et objectif calorique (Mifflin-St Jeor)
- **Tableau de bord** — anneau de calories nets, macronutriments, graphique hebdomadaire
- **Journal alimentaire** — base d'aliments avec recherche, contrôle de quantité par repas
- **Analyse photo IA** — estimation nutritionnelle d'une photo de repas via Claude Vision
- **Activités** — corde à sauter, tennis, exercices maison (abdos, squats, gainage…)

## Installation locale

```bash
npm install
npm run dev
```

Ouvre [http://localhost:5173/nutrition-tracker/](http://localhost:5173/nutrition-tracker/)

## Déploiement sur GitHub Pages

### Option 1 — Automatique (recommandé)

Chaque `git push` sur `main` déclenche le workflow GitHub Actions `.github/workflows/deploy.yml` qui build et déploie automatiquement.

**Prérequis GitHub :**
1. Aller dans **Settings → Pages**
2. Source : **Deploy from a branch**
3. Branch : **gh-pages** / **(root)**

### Option 2 — Manuel

```bash
npm run build
npm run deploy
```

### URL de l'application

```
https://<votre-username>.github.io/nutrition-tracker/
```

## Stack technique

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [Claude API](https://www.anthropic.com/) — analyse photo IA
- [gh-pages](https://github.com/tschaub/gh-pages) — déploiement
