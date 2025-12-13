# Configuration des variables d'environnement dans Koyeb

## Variables d'environnement requises pour le backend

### Variables déjà configurées
- `BREVO_API_KEY` - Clé API Brevo pour l'envoi d'emails
- `GROQ_API_KEY` - Clé API Groq pour les LLMs
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase

### Variable REQUISE pour la génération d'images

#### `HUGGINGFACE_API_TOKEN` (REQUIS - 100% Gratuit)
- **Description** : Token API Hugging Face requis pour la génération d'images
- **Où l'obtenir** : [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (gratuit)
- **Format** : `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Important** : ⚠️ **Cette variable est REQUISE !** L'API Hugging Face nécessite maintenant une authentification.
- **Comment obtenir le token (gratuit)** :
  1. Allez sur [huggingface.co](https://huggingface.co)
  2. Créez un compte gratuit (si nécessaire)
  3. Allez dans **Settings** → **Access Tokens**
  4. Cliquez sur **New token**
  5. Donnez un nom (ex: "FasarliAI")
  6. Sélectionnez **Read** (lecture seule)
  7. Cliquez sur **Generate token**
  8. Copiez le token (commence par `hf_...`)

## Vérification

Après le déploiement, vérifiez que tout fonctionne :
1. Uploadez un PDF dans l'application
2. Tapez un prompt dans le chat
3. Cliquez sur le bouton d'image (🖼️)
4. L'image devrait être générée (gratuitement !)

## Note importante

⚠️ **Le token Hugging Face est maintenant REQUIS** - Mais il est 100% gratuit à obtenir !  
✅ **La génération d'images reste 100% gratuite** - Vous devez juste créer un compte gratuit sur Hugging Face et générer un token.

