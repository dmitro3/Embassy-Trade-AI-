import { useState, useEffect } from 'react';

const MOCK_POSTS = [
  {
    id: 1,
    author: '0x123...789',
    username: 'EMBTrader',
    title: 'My EMB Trading Strategy',
    content: 'Here\'s how I\'ve been trading EMB with success using a combination of AI signals and technical analysis...',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    likes: 24,
    comments: 8,
    tags: ['strategy', 'technical-analysis', 'ai']
  },
  {
    id: 2,
    author: '0x456...321',
    username: 'CryptoWizard',
    title: 'Risk Management Tips',
    content: 'Important risk management principles every EMB trader should follow...',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    likes: 45,
    comments: 12,
    tags: ['risk-management', 'tips']
  }
];

const MOCK_COMMENTS = {
  1: [
    {
      id: 1,
      author: '0x789...123',
      username: 'TradingPro',
      content: 'Great strategy! I\'ve been using something similar with good results.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      likes: 5
    },
    {
      id: 2,
      author: '0x321...456',
      username: 'NewTrader',
      content: 'Could you explain more about your stop-loss placement?',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      likes: 2
    }
  ]
};

export default function CommunityForum({ userId }) {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' });
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('latest');
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        // In production, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
        setPosts(MOCK_POSTS);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      // Load comments for selected post
      const postComments = MOCK_COMMENTS[selectedPost.id] || [];
      setComments(postComments);
    }
  }, [selectedPost]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!userId) return;

    try {
      // In production, this would be an API call
      const post = {
        id: Date.now(),
        author: userId,
        username: 'You',
        title: newPost.title,
        content: newPost.content,
        tags: newPost.tags.split(',').map(tag => tag.trim()),
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0
      };

      setPosts(current => [post, ...current]);
      setNewPost({ title: '', content: '', tags: '' });
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!userId || !selectedPost) return;

    try {
      const comment = {
        id: Date.now(),
        author: userId,
        username: 'You',
        content: newComment,
        timestamp: new Date().toISOString(),
        likes: 0
      };

      setComments(current => [...current, comment]);
      setNewComment('');

      // Update comment count in post
      setPosts(current =>
        current.map(post =>
          post.id === selectedPost.id
            ? { ...post, comments: post.comments + 1 }
            : post
        )
      );
    } catch (err) {
      console.error('Failed to create comment:', err);
    }
  };

  const handleLike = async (postId) => {
    if (!userId) return;

    setPosts(current =>
      current.map(post =>
        post.id === postId
          ? { ...post, likes: post.likes + 1 }
          : post
      )
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000; // difference in seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (!userId) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <p className="text-gray-400">Connect your wallet to participate in discussions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-blue-400">Community Forum</h2>
        <div className="flex space-x-2">
          {['latest', 'top', 'trending'].map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === option ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create Post Form */}
      <form onSubmit={handleCreatePost} className="mb-6">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Post title"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Share your trading insights..."
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="w-full h-32 px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={newPost.tags}
            onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newPost.title || !newPost.content}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
          >
            Create Post
          </button>
        </div>
      </form>

      {/* Posts List */}
      {!selectedPost ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-4 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700/70"
              onClick={() => setSelectedPost(post)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium">{post.title}</h3>
                <span className="text-sm text-gray-400">
                  {formatTimestamp(post.timestamp)}
                </span>
              </div>
              <p className="text-gray-300 mb-3 line-clamp-2">{post.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                    className="text-sm text-gray-400 hover:text-blue-400"
                  >
                    👍 {post.likes}
                  </button>
                  <span className="text-sm text-gray-400">
                    💬 {post.comments}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTag(tag);
                      }}
                      className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full cursor-pointer hover:bg-blue-500/30"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Post Detail View
        <div>
          <button
            onClick={() => setSelectedPost(null)}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Back to posts
          </button>

          <div className="p-4 bg-gray-700/50 rounded-lg mb-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-medium">{selectedPost.title}</h3>
              <span className="text-sm text-gray-400">
                {formatTimestamp(selectedPost.timestamp)}
              </span>
            </div>
            <p className="text-gray-300 mb-4 whitespace-pre-wrap">
              {selectedPost.content}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleLike(selectedPost.id)}
                  className="text-sm text-gray-400 hover:text-blue-400"
                >
                  👍 {selectedPost.likes}
                </button>
                <span className="text-sm text-gray-400">
                  💬 {selectedPost.comments}
                </span>
              </div>
              <div className="flex space-x-2">
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4 mb-6">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 bg-gray-700/30 rounded">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{comment.username}</span>
                  <span className="text-sm text-gray-400">
                    {formatTimestamp(comment.timestamp)}
                  </span>
                </div>
                <p className="text-gray-300">{comment.content}</p>
                <button
                  onClick={() => {
                    // Handle comment like
                  }}
                  className="mt-2 text-sm text-gray-400 hover:text-blue-400"
                >
                  👍 {comment.likes}
                </button>
              </div>
            ))}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleCreateComment}>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-grow px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newComment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}