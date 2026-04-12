-- RLS policies: public read for blog tables
CREATE POLICY "public_read_blog_posts" ON blog_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_blog_post_translations" ON blog_post_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_blog_tags" ON blog_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_blog_tag_translations" ON blog_tag_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_blog_post_tags" ON blog_post_tags FOR SELECT TO anon, authenticated USING (true);
