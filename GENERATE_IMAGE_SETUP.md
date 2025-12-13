# Configuration de la génération d'images (GRATUIT)

La fonctionnalité de génération d'images utilise **Hugging Face Inference API** (GRATUIT) avec Stable Diffusion pour créer des illustrations basées sur le contenu de vos PDFs.

## ✅ Solution 100% Gratuite

- **Token Hugging Face gratuit requis** (gratuit à obtenir)
- **Gratuit** pour un usage modéré
- **Stable Diffusion v1.5** - modèle de qualité professionnelle
- **Pas de limite de crédit** (rate limits généreux)

## Configuration Requise

### Étape 1 : Obtenir un token Hugging Face (GRATUIT)

1. Allez sur [huggingface.co](https://huggingface.co)
2. Créez un compte gratuit (si vous n'en avez pas)
3. Allez dans **Settings** → **Access Tokens** → [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. Cliquez sur **New token**
5. Donnez un nom (ex: "FasarliAI")
6. Sélectionnez **Read** (lecture seule suffit pour l'API Inference)
7. **Important** : Acceptez les termes d'utilisation de l'API Inference si demandé
8. Cliquez sur **Generate token**
9. **Copiez le token** (il commence par `hf_...`)

**Note** : Si vous obtenez une erreur 403, assurez-vous d'avoir accepté les conditions d'utilisation de l'API Inference dans vos paramètres Hugging Face.

### Étape 2 : Ajouter le token dans votre backend

#### Pour développement local (`backend/.env`) :
```env
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Pour Koyeb (déploiement) :
1. Allez sur [koyeb.com](https://www.koyeb.com)
2. Ouvrez votre service `fasarliai-backend`
3. Allez dans **Settings** → **Environment Variables**
4. Cliquez sur **Add Variable**
5. Nom : `HUGGINGFACE_API_TOKEN`
6. Valeur : votre token Hugging Face (commence par `hf_...`)
7. Cliquez sur **Save**

**Note** : Le token est maintenant **requis** pour utiliser l'API Inference de Hugging Face. C'est gratuit et simple à obtenir !

## Utilisation

1. **Uploadez un PDF** dans le chat
2. **Tapez votre prompt** dans la zone de texte (ex: "a diagram showing photosynthesis")
3. **Cliquez sur le bouton d'image** (icône 🖼️) à côté du bouton d'envoi
4. L'image sera générée et affichée dans le chat

## Fonctionnalités

- **100% Gratuit** : Aucun coût par image
- **Contexte PDF** : Le système utilise le contenu de votre PDF pour améliorer le prompt
- **Stable Diffusion v1.5** : Modèle de qualité professionnelle
- **Taille** : Images générées en 512x512 pixels
- **Pas de dépendances externes** : Utilise uniquement `requests` (déjà installé)

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

