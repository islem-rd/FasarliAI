# Guide : Comment exécuter les migrations SQL

## Méthode 1 : Via Supabase Dashboard (Recommandé)

### Étape 1 : Accéder au SQL Editor

1. Allez sur [supabase.com](https://supabase.com) et connectez-vous
2. Sélectionnez votre projet FasarliAI
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New Query**

### Étape 2 : Exécuter la migration 004

1. Ouvrez le fichier : `backend/supabase/migrations/004_ensure_user_columns.sql`
2. Copiez tout le contenu du fichier
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter` / `Cmd+Enter`)

**Contenu de la migration 004 :**
```sql
-- Ensure username column exists (in case migration 001 wasn't run)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username TEXT;
    END IF;
END $$;

-- Ensure avatar_url column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;
```

### Étape 3 : Exécuter la migration 005

1. Ouvrez le fichier : `backend/supabase/migrations/005_create_avatars_bucket.sql`
2. Copiez tout le contenu du fichier
3. Dans le SQL Editor, créez une **nouvelle query** (New Query)
4. Collez le contenu
5. Cliquez sur **Run**

**Contenu de la migration 005 :**
```sql
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload their own avatars
CREATE POLICY IF NOT EXISTS "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow anyone to read avatars (public bucket)
CREATE POLICY IF NOT EXISTS "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Create policy to allow users to update their own avatars
CREATE POLICY IF NOT EXISTS "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own avatars
CREATE POLICY IF NOT EXISTS "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Étape 4 : Vérifier que tout est créé

1. **Vérifier les colonnes** :
   - Allez dans **Table Editor** → **users**
   - Vérifiez que les colonnes `username` et `avatar_url` existent

2. **Vérifier le bucket** :
   - Allez dans **Storage** → **Buckets**
   - Vérifiez que le bucket `avatars` existe et est public

3. **Vérifier les politiques** :
   - Allez dans **Storage** → **Policies** → **avatars**
   - Vous devriez voir 4 politiques créées

## Méthode 2 : Via Supabase CLI

Si vous avez installé Supabase CLI :

```bash
# Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref votre-project-ref

# Exécuter les migrations
supabase db push
```

## Méthode 3 : Exécuter les deux migrations en une seule fois

Vous pouvez aussi copier-coller les deux migrations dans une seule query :

1. Ouvrez les deux fichiers de migration
2. Copiez le contenu des deux
3. Collez-les dans une seule query dans Supabase SQL Editor
4. Exécutez

## Vérification finale

Après avoir exécuté les migrations, testez :

1. Allez sur votre application → **Settings**
2. Essayez de :
   - Modifier votre username
   - Uploader une image de profil

Si tout fonctionne, c'est bon ! ✅

## En cas d'erreur

### Erreur : "permission denied"
- Assurez-vous d'être connecté avec un compte admin
- La migration 005 nécessite des privilèges admin

### Erreur : "bucket already exists"
- C'est normal, le `ON CONFLICT DO NOTHING` empêche l'erreur
- Vérifiez juste que le bucket existe dans Storage

### Erreur : "column already exists"
- C'est normal, les migrations utilisent `IF NOT EXISTS`
- Vérifiez juste que les colonnes existent dans Table Editor

