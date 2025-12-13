# Configuration de la génération d'images (GRATUIT)

La fonctionnalité de génération d'images utilise **Hugging Face Inference API** (GRATUIT) avec Stable Diffusion pour créer des illustrations basées sur le contenu de vos PDFs.

## ✅ Solution 100% Gratuite

- **Aucune clé API requise** pour commencer
- **Gratuit** pour un usage modéré
- **Stable Diffusion v1.5** - modèle de qualité professionnelle
- **Pas de limite de crédit** (rate limits généreux)

## Configuration (Optionnelle)

### Option 1 : Sans token (Recommandé pour débuter)
**Aucune configuration nécessaire !** Le système fonctionne directement sans token.

### Option 2 : Avec token Hugging Face (Pour plus de requêtes)

Si vous avez besoin de plus de requêtes par minute :

1. Allez sur [huggingface.co](https://huggingface.co)
2. Créez un compte gratuit
3. Allez dans **Settings** → **Access Tokens**
4. Créez un nouveau token (lecture seule suffit)

Ajoutez dans `backend/.env` (optionnel) :
```env
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note** : Le token est optionnel. Sans token, vous avez toujours accès gratuit mais avec des limites de rate plus basses.

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

