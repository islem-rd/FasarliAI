# Vérification du Setup - Avatars et Username

## ✅ Étapes de vérification

### 1. Vérifier dans Supabase Dashboard

#### Vérifier les colonnes de la table users
1. Allez dans **Table Editor** → **users**
2. Vérifiez que vous voyez les colonnes :
   - ✅ `username` (TEXT, nullable)
   - ✅ `avatar_url` (TEXT, nullable)

#### Vérifier le bucket avatars
1. Allez dans **Storage** → **Buckets**
2. Vérifiez que le bucket `avatars` existe
3. Vérifiez qu'il est marqué comme **Public**

#### Vérifier les politiques
1. Allez dans **Storage** → **Policies** → **avatars**
2. Vous devriez voir 4 politiques :
   - ✅ "Users can upload their own avatars" (INSERT)
   - ✅ "Anyone can read avatars" (SELECT)
   - ✅ "Users can update their own avatars" (UPDATE)
   - ✅ "Users can delete their own avatars" (DELETE)

### 2. Tester dans l'application

#### Tester la modification du username
1. Connectez-vous à votre application
2. Allez dans **Settings** (menu en haut à droite)
3. Dans la section **Username**, modifiez votre nom d'utilisateur
4. Cliquez sur **Update Username**
5. ✅ Vérifiez que vous voyez un message de succès

#### Tester l'upload d'avatar
1. Toujours dans **Settings**
2. Dans la section **Profile Picture**, cliquez sur **Upload Photo**
3. Sélectionnez une image (JPG, PNG ou WebP, max 5MB)
4. ✅ Vérifiez que l'image s'affiche après l'upload
5. ✅ Vérifiez que l'avatar apparaît dans le menu en haut à droite

### 3. Vérifier les logs (si problème)

Si quelque chose ne fonctionne pas :
1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs dans l'onglet **Console**
3. Regardez les requêtes dans l'onglet **Network**

## 🎉 Si tout fonctionne

Félicitations ! Votre système d'avatars et de username est maintenant opérationnel.

## ❌ Si quelque chose ne fonctionne pas

### Erreur : "Column not found"
- Vérifiez que la migration 004 a bien été exécutée
- Rafraîchissez la page

### Erreur : "Bucket not found"
- Vérifiez que la migration 005 a bien été exécutée
- Vérifiez que le bucket `avatars` existe dans Storage

### Erreur : "Permission denied"
- Vérifiez que les politiques de sécurité sont bien créées
- Vérifiez que vous êtes bien connecté

### L'avatar ne s'affiche pas
- Vérifiez que le bucket est **Public**
- Vérifiez l'URL de l'avatar dans la console
- Vérifiez que l'image a bien été uploadée dans Storage → avatars

