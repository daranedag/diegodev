import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import BlogCard from './BlogCard';

const BlogList = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .eq('published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
                <BlogCard key={post.id} post={post} />
            ))}
        </div>
    );
};

export default BlogList;