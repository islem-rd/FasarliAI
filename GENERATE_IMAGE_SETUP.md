# Configuration de la génération d'images (GRATUIT - SIMPLE)

La fonctionnalité de génération d'images utilise **DeepAI API** (GRATUIT pour tester) - une solution simple et facile à utiliser sans dépendances complexes.

## ✅ Solution 100% Gratuite

- **Token Hugging Face gratuit requis** (gratuit à obtenir)
- **Gratuit** pour un usage modéré
- **Stable Diffusion v1.5** - modèle de qualité professionnelle
- **Pas de limite de crédit** (rate limits généreux)

## Configuration (TRÈS SIMPLE - Aucune configuration requise pour tester !)

### Option 1 : Utilisation gratuite (Démo)
**Aucune configuration nécessaire !** Le système utilise une clé de démonstration gratuite pour tester.

### Option 2 : Utilisation avec votre propre clé (Recommandé pour production)

1. Allez sur [deepai.org](https://deepai.org)
2. Créez un compte gratuit
3. Allez dans **API Keys**
4. Créez une nouvelle clé API
5. Copiez votre clé

#### Pour développement local (`backend/.env`) :
```env
DEEPAI_API_KEY=votre_cle_api
```

#### Pour Koyeb (déploiement) :
1. Allez sur [koyeb.com](https://www.koyeb.com)
2. Ouvrez votre service `fasarliai-backend`
3. Allez dans **Settings** → **Environment Variables**
4. Cliquez sur **Add Variable**
5. Nom : `DEEPAI_API_KEY`
6. Valeur : votre clé DeepAI
7. Cliquez sur **Save**

**Note** : Sans clé personnalisée, le système utilise une clé de démonstration gratuite (limite de requêtes).

## Utilisation

1. **Uploadez un PDF** dans le chat
2. **Tapez votre prompt** dans la zone de texte (ex: "a diagram showing photosynthesis")
3. **Cliquez sur le bouton d'image** (icône 🖼️) à côté du bouton d'envoi
4. L'image sera générée et affichée dans le chat

## Fonctionnalités

- **100% Gratuit** : Clé de démonstration gratuite (ou votre propre clé gratuite)
- **Très Simple** : Utilise uniquement `requests` (déjà installé) - pas de dépendances complexes
- **Contexte PDF** : Le système utilise le contenu de votre PDF pour améliorer le prompt
- **Facile à tester** : Fonctionne immédiatement sans configuration
- **Pas de dépendances complexes** : Utilise uniquement `requests` (déjà installé)

## Notes

- La génération prend généralement 15-30 secondes (première fois peut prendre plus si le modèle charge)
- Les images sont encodées en base64 et envoyées directement au frontend
- **Rate Limits** : 
  - Sans token : ~30 requêtes/heure
  - Avec token : ~1000 requêtes/heure
- Si le modèle est en train de charger (503), attendez 10 secondes et réessayez

## Avantages vs Replicate

✅ **Gratuit** (vs $0.002-0.01 par image)  
✅ **Pas de clé API requise** pour commencer  
✅ **Même qualité** (Stable Diffusion)  
✅ **Simple** (utilise seulement `requests`)

