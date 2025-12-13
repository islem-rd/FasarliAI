# Configuration des variables d'environnement dans Koyeb

## Variables d'environnement requises pour le backend

### Variables déjà configurées
- `BREVO_API_KEY` - Clé API Brevo pour l'envoi d'emails
- `GROQ_API_KEY` - Clé API Groq pour les LLMs
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase

### Variable optionnelle pour la génération d'images

#### `HUGGINGFACE_API_TOKEN` (Optionnel - 100% Gratuit sans)
- **Description** : Token API Hugging Face pour augmenter les limites de rate (optionnel)
- **Où l'obtenir** : [huggingface.co](https://huggingface.co) → Settings → Access Tokens
- **Format** : `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Important** : ✅ **Cette variable est optionnelle !** La génération d'images fonctionne sans token (gratuit).
- **Quand l'ajouter** : Seulement si vous avez besoin de plus de 30 requêtes/heure
- **Sans token** : ~30 requêtes/heure (gratuit)
- **Avec token** : ~1000 requêtes/heure (gratuit aussi)

## Vérification

Après le déploiement, vérifiez que tout fonctionne :
1. Uploadez un PDF dans l'application
2. Tapez un prompt dans le chat
3. Cliquez sur le bouton d'image (🖼️)
4. L'image devrait être générée (gratuitement !)

## Note importante

✅ **La génération d'images est 100% gratuite** - Aucune configuration requise pour commencer !

