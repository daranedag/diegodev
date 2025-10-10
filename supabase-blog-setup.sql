-- Crear las tablas para el blog en Supabase
-- Ejecuta este SQL en el SQL Editor de tu proyecto Supabase

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de posts
CREATE TABLE blog_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    cover_image_url TEXT,
    author_id UUID,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    views_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER
);

-- Traducciones de posts
CREATE TABLE blog_post_translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    meta_description TEXT,
    UNIQUE(post_id, language_code)
);

-- Tags
CREATE TABLE blog_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traducciones de tags
CREATE TABLE blog_tag_translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE(tag_id, language_code)
);

-- Relación posts-tags (muchos a muchos)
CREATE TABLE blog_post_tags (
    post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY(post_id, tag_id)
);

-- Categorías (opcional)
CREATE TABLE blog_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES blog_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traducciones de categorías
CREATE TABLE blog_category_translations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES blog_categories(id) ON DELETE CASCADE,
    language_code VARCHAR(5) NOT NULL,
    name VARCHAR(100) NOT NULL,
    UNIQUE(category_id, language_code)
);

-- Índices para mejorar performance
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_post_translations_language ON blog_post_translations(language_code);
CREATE INDEX idx_blog_post_translations_post_id ON blog_post_translations(post_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para updated_at en blog_posts
CREATE TRIGGER update_blog_posts_updated_at 
    BEFORE UPDATE ON blog_posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para incrementar vistas de post
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE blog_posts 
    SET views_count = views_count + 1 
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS (Row Level Security) - Para seguridad
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tag_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_category_translations ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública (posts publicados)
CREATE POLICY "Public can read published posts" ON blog_posts
    FOR SELECT USING (status = 'published');

CREATE POLICY "Public can read post translations" ON blog_post_translations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE id = blog_post_translations.post_id 
            AND status = 'published'
        )
    );

CREATE POLICY "Public can read tags" ON blog_tags
    FOR SELECT USING (true);

CREATE POLICY "Public can read tag translations" ON blog_tag_translations
    FOR SELECT USING (true);

CREATE POLICY "Public can read post-tag relations" ON blog_post_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM blog_posts 
            WHERE id = blog_post_tags.post_id 
            AND status = 'published'
        )
    );

CREATE POLICY "Public can read categories" ON blog_categories
    FOR SELECT USING (true);

CREATE POLICY "Public can read category translations" ON blog_category_translations
    FOR SELECT USING (true);

-- Para administración (Retool), necesitarás crear políticas adicionales
-- o usar el service role key en lugar del anon key

-- ========================================
-- DATOS DE EJEMPLO
-- ========================================

-- Insertar categorías de ejemplo
INSERT INTO blog_categories (id, slug) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'desarrollo'),
    ('550e8400-e29b-41d4-a716-446655440002', 'tecnologia'),
    ('550e8400-e29b-41d4-a716-446655440003', 'tutorial');

-- Traducciones de categorías
INSERT INTO blog_category_translations (category_id, language_code, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'es', 'Desarrollo'),
    ('550e8400-e29b-41d4-a716-446655440001', 'en', 'Development'),
    ('550e8400-e29b-41d4-a716-446655440002', 'es', 'Tecnología'),
    ('550e8400-e29b-41d4-a716-446655440002', 'en', 'Technology'),
    ('550e8400-e29b-41d4-a716-446655440003', 'es', 'Tutorial'),
    ('550e8400-e29b-41d4-a716-446655440003', 'en', 'Tutorial');

-- Insertar tags de ejemplo
INSERT INTO blog_tags (id, slug) VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', 'react'),
    ('550e8400-e29b-41d4-a716-446655440011', 'javascript'),
    ('550e8400-e29b-41d4-a716-446655440012', 'nodejs'),
    ('550e8400-e29b-41d4-a716-446655440013', 'supabase'),
    ('550e8400-e29b-41d4-a716-446655440014', 'tailwindcss'),
    ('550e8400-e29b-41d4-a716-446655440015', 'frontend'),
    ('550e8400-e29b-41d4-a716-446655440016', 'backend');

-- Traducciones de tags
INSERT INTO blog_tag_translations (tag_id, language_code, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440010', 'es', 'React'),
    ('550e8400-e29b-41d4-a716-446655440010', 'en', 'React'),
    ('550e8400-e29b-41d4-a716-446655440011', 'es', 'JavaScript'),
    ('550e8400-e29b-41d4-a716-446655440011', 'en', 'JavaScript'),
    ('550e8400-e29b-41d4-a716-446655440012', 'es', 'Node.js'),
    ('550e8400-e29b-41d4-a716-446655440012', 'en', 'Node.js'),
    ('550e8400-e29b-41d4-a716-446655440013', 'es', 'Supabase'),
    ('550e8400-e29b-41d4-a716-446655440013', 'en', 'Supabase'),
    ('550e8400-e29b-41d4-a716-446655440014', 'es', 'Tailwind CSS'),
    ('550e8400-e29b-41d4-a716-446655440014', 'en', 'Tailwind CSS'),
    ('550e8400-e29b-41d4-a716-446655440015', 'es', 'Frontend'),
    ('550e8400-e29b-41d4-a716-446655440015', 'en', 'Frontend'),
    ('550e8400-e29b-41d4-a716-446655440016', 'es', 'Backend'),
    ('550e8400-e29b-41d4-a716-446655440016', 'en', 'Backend');

-- Insertar posts de ejemplo
INSERT INTO blog_posts (id, slug, cover_image_url, status, published_at, reading_time_minutes, views_count) VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', 'mi-primer-blog-post', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800', 'published', '2025-10-01 10:00:00+00', 5, 42),
    ('550e8400-e29b-41d4-a716-446655440021', 'como-configurar-supabase-react', 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800', 'published', '2025-10-05 14:30:00+00', 8, 156),
    ('550e8400-e29b-41d4-a716-446655440022', 'future-web-development', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'draft', '2025-10-10 09:00:00+00', 12, 0);

-- Traducciones de posts en español
INSERT INTO blog_post_translations (post_id, language_code, title, excerpt, content, meta_description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', 'es', 
     '¡Bienvenidos a mi blog!', 
     'Este es mi primer post donde comparto mis pensamientos sobre desarrollo web y tecnología.',
     '# ¡Bienvenidos a mi blog!

¡Hola a todos! Me complace dar la bienvenida a mi nuevo blog, un espacio donde compartiré mis experiencias, aprendizajes y reflexiones sobre el mundo del desarrollo web y la tecnología.

## ¿Qué encontrarás aquí?

En este blog escribiré sobre:

- **Desarrollo Frontend**: Tips, trucos y mejores prácticas con React, Vue, y otras tecnologías modernas
- **Backend Development**: Explorando Node.js, APIs, bases de datos y arquitecturas escalables
- **Herramientas y Productividad**: Revisiones de herramientas que uso en mi día a día
- **Reflexiones Técnicas**: Análisis profundos sobre decisiones de arquitectura y diseño

## Mi enfoque

Creo firmemente que la mejor manera de aprender es enseñando y compartiendo conocimiento. Por eso, cada post estará escrito desde la experiencia práctica, con ejemplos reales y casos de uso que he enfrentado en proyectos reales.

## ¿Qué viene?

En los próximos posts estaremos explorando:

1. Configuración de Supabase con React
2. Mejores prácticas en Tailwind CSS
3. Optimización de performance en aplicaciones web
4. Y mucho más...

¡Espero que este contenido sea útil para tu crecimiento como desarrollador/a!

---

*¿Tienes algún tema específico que te gustaría que cubra? ¡Déjame un comentario!*',
     'Mi primer post en el blog donde doy la bienvenida y explico qué tipo de contenido compartir.'),

    ('550e8400-e29b-41d4-a716-446655440021', 'es',
     'Cómo configurar Supabase con React paso a paso',
     'Tutorial completo para integrar Supabase en tu aplicación React, desde la configuración inicial hasta la implementación de autenticación.',
     '# Cómo configurar Supabase con React paso a paso

Supabase se ha convertido en una de las alternativas más populares a Firebase, especialmente para desarrolladores que prefieren trabajar con PostgreSQL. En este tutorial te mostraré cómo integrar Supabase en tu aplicación React.

## ¿Qué es Supabase?

Supabase es una plataforma de Backend-as-a-Service (BaaS) que proporciona:

- Base de datos PostgreSQL
- Autenticación
- APIs automáticas
- Realtime subscriptions
- Storage para archivos
- Edge Functions

## Configuración inicial

### 1. Crear un proyecto en Supabase

Primero, ve a [supabase.com](https://supabase.com) y crea una cuenta. Luego:

1. Click en "New Project"
2. Elige tu organización
3. Asigna un nombre a tu proyecto
4. Selecciona una región cercana
5. Crea una contraseña segura para la base de datos

### 2. Instalar el cliente de Supabase

```bash
npm install @supabase/supabase-js
```

### 3. Configurar las variables de entorno

Crea un archivo `.env` en la raíz de tu proyecto:

```env
REACT_APP_SUPABASE_URL=tu_supabase_url
REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
```

### 4. Crear el cliente de Supabase

Crea un archivo `src/lib/supabase.js`:

```javascript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Creando tu primera tabla

En el SQL Editor de Supabase, ejecuta:

```sql
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública
CREATE POLICY "Posts are publicly readable" ON posts
  FOR SELECT USING (true);
```

## Implementando operaciones CRUD

### Leer datos

```javascript
import { supabase } from "./lib/supabase"

const fetchPosts = async () => {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) console.error("Error:", error)
  return data
}
```

### Insertar datos

```javascript
const createPost = async (title, content) => {
  const { data, error } = await supabase
    .from("posts")
    .insert({ title, content })
    .select()
  
  if (error) console.error("Error:", error)
  return data
}
```

## Conclusión

Supabase ofrece una experiencia de desarrollo excelente con React. Su API intuitiva y la potencia de PostgreSQL lo convierten en una opción ideal para proyectos modernos.

En el próximo post exploraremos la autenticación con Supabase. ¡No te lo pierdas!',
     'Tutorial paso a paso para configurar Supabase con React, incluyendo configuración inicial y operaciones CRUD básicas.');

-- Traducciones de posts en inglés
INSERT INTO blog_post_translations (post_id, language_code, title, excerpt, content, meta_description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', 'en', 
     'Welcome to my blog!', 
     'This is my first post where I share my thoughts on web development and technology.',
     '# Welcome to my blog!

Hello everyone! I''m excited to welcome you to my new blog, a space where I''ll share my experiences, learnings, and reflections about the world of web development and technology.

## What will you find here?

In this blog I''ll write about:

- **Frontend Development**: Tips, tricks, and best practices with React, Vue, and other modern technologies
- **Backend Development**: Exploring Node.js, APIs, databases, and scalable architectures
- **Tools and Productivity**: Reviews of tools I use in my daily work
- **Technical Reflections**: Deep analysis of architecture and design decisions

## My approach

I firmly believe that the best way to learn is by teaching and sharing knowledge. That''s why each post will be written from practical experience, with real examples and use cases I''ve faced in real projects.

## What''s coming?

In upcoming posts we''ll be exploring:

1. Setting up Supabase with React
2. Best practices in Tailwind CSS
3. Performance optimization in web applications
4. And much more...

I hope this content will be useful for your growth as a developer!

---

*Do you have any specific topic you''d like me to cover? Leave me a comment!*',
     'My first blog post where I welcome readers and explain what type of content I''ll be sharing.'),

    ('550e8400-e29b-41d4-a716-446655440021', 'en',
     'How to set up Supabase with React step by step',
     'Complete tutorial to integrate Supabase in your React application, from initial setup to authentication implementation.',
     '# How to set up Supabase with React step by step

Supabase has become one of the most popular alternatives to Firebase, especially for developers who prefer working with PostgreSQL. In this tutorial I''ll show you how to integrate Supabase into your React application.

## What is Supabase?

Supabase is a Backend-as-a-Service (BaaS) platform that provides:

- PostgreSQL database
- Authentication
- Automatic APIs
- Realtime subscriptions
- File storage
- Edge Functions

## Initial setup

### 1. Create a Supabase project

First, go to [supabase.com](https://supabase.com) and create an account. Then:

1. Click "New Project"
2. Choose your organization
3. Give your project a name
4. Select a nearby region
5. Create a secure password for the database

### 2. Install the Supabase client

```bash
npm install @supabase/supabase-js
```

### 3. Configure environment variables

Create a `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Create the Supabase client

Create a file `src/lib/supabase.js`:

```javascript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## Creating your first table

In the Supabase SQL Editor, execute:

```sql
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy for public reading
CREATE POLICY "Posts are publicly readable" ON posts
  FOR SELECT USING (true);
```

## Implementing CRUD operations

### Reading data

```javascript
import { supabase } from "./lib/supabase"

const fetchPosts = async () => {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) console.error("Error:", error)
  return data
}
```

### Inserting data

```javascript
const createPost = async (title, content) => {
  const { data, error } = await supabase
    .from("posts")
    .insert({ title, content })
    .select()
  
  if (error) console.error("Error:", error)
  return data
}
```

## Conclusion

Supabase offers an excellent development experience with React. Its intuitive API and the power of PostgreSQL make it an ideal choice for modern projects.

In the next post we''ll explore authentication with Supabase. Don''t miss it!',
     'Step-by-step tutorial to set up Supabase with React, including initial configuration and basic CRUD operations.');

-- Relaciones post-tags
INSERT INTO blog_post_tags (post_id, tag_id) VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010'), -- React
    ('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440015'), -- Frontend
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440010'), -- React
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440013'), -- Supabase
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011'), -- JavaScript
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440015'); -- Frontend