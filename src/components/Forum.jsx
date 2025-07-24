import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { 
  MessageSquare, Plus, Search, ThumbsUp, MessageCircle, 
  Share2, Filter, Tag, Users, X, Send
} from 'lucide-react';

const Forum = () => {
  const { isDark } = useTheme();
  const [discussions, setDiscussions] = useState([]);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    tags: [],
    department: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'forum'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDiscussions(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });
    return unsubscribe;
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      await addDoc(collection(db, 'forum'), {
        ...newPost,
        author: auth.currentUser.email,
        createdAt: new Date(),
        likes: [],
        comments: []
      });
      setNewPost({ title: '', content: '', tags: [], department: '' });
      setShowNewPost(false);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLike = async (postId, likes) => {
    const userId = auth.currentUser.uid;
    const postRef = doc(db, 'forum', postId);
    
    try {
      if (likes.includes(userId)) {
        await updateDoc(postRef, {
          likes: arrayRemove(userId)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(userId)
        });
      }
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleAddComment = async (postId, comment) => {
    if (!comment.trim()) return;

    const postRef = doc(db, 'forum', postId);
    try {
      await updateDoc(postRef, {
        comments: arrayUnion({
          content: comment,
          author: auth.currentUser.email,
          createdAt: new Date()
        })
      });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch = discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || discussion.tags.includes(selectedTag);
    const matchesDepartment = !selectedDepartment || discussion.department === selectedDepartment;
    return matchesSearch && matchesTag && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Discussion Forum
            </h2>
            <button
              onClick={() => setShowNewPost(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Discussion
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl 
                         text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                         border border-slate-200 dark:border-slate-600"
              />
            </div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl
                       text-gray-900 dark:text-white border border-slate-200 dark:border-slate-600"
            >
              <option value="">All Tags</option>
              <option value="question">Question</option>
              <option value="discussion">Discussion</option>
              <option value="announcement">Announcement</option>
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl
                       text-gray-900 dark:text-white border border-slate-200 dark:border-slate-600"
            >
              <option value="">All Departments</option>
              <option value="water">Water Department</option>
              <option value="roads">Roads & Infrastructure</option>
              <option value="power">Power & Energy</option>
            </select>
          </div>

          {/* Discussions List */}
          <div className="space-y-4">
            {filteredDiscussions.map(discussion => (
              <motion.div
                key={discussion.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {discussion.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <Users className="w-4 h-4" />
                      <span>{discussion.author}</span>
                      <span>•</span>
                      <span>{new Date(discussion.createdAt.toDate()).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {discussion.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {discussion.content}
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(discussion.id, discussion.likes)}
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span>{discussion.likes?.length || 0}</span>
                  </button>
                  <button
                    onClick={() => setShowComments({ ...showComments, [discussion.id]: !showComments[discussion.id] })}
                    className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{discussion.comments?.length || 0}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {showComments[discussion.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 space-y-4"
                    >
                      {discussion.comments?.map((comment, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-slate-800 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <span>{comment.author}</span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt.toDate()).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300">
                            {comment.content}
                          </p>
                        </div>
                      ))}
                      
                      {/* Add Comment Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const comment = e.target.comment.value;
                          handleAddComment(discussion.id, comment);
                          e.target.reset();
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="comment"
                          placeholder="Add a comment..."
                          className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg
                                   text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                                   border border-slate-200 dark:border-slate-600"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create New Discussion
                </h3>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input
                  type="text"
                  placeholder="Discussion Title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl
                           text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                           border border-slate-200 dark:border-slate-600"
                />
                <textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl
                           text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                           border border-slate-200 dark:border-slate-600 h-32"
                />
                <select
                  value={newPost.department}
                  onChange={(e) => setNewPost({ ...newPost, department: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl
                           text-gray-900 dark:text-white border border-slate-200 dark:border-slate-600"
                >
                  <option value="">Select Department</option>
                  <option value="water">Water Department</option>
                  <option value="roads">Roads & Infrastructure</option>
                  <option value="power">Power & Energy</option>
                </select>
                <div className="flex flex-wrap gap-2">
                  {['question', 'discussion', 'announcement'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const tags = newPost.tags.includes(tag)
                          ? newPost.tags.filter(t => t !== tag)
                          : [...newPost.tags, tag];
                        setNewPost({ ...newPost, tags });
                      }}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        newPost.tags.includes(tag)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl
                           hover:bg-indigo-700 transition-colors"
                >
                  Create Discussion
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Forum;