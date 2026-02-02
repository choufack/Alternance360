'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, MessageSquare } from 'lucide-react'
import { addComment, getComments } from '@/app/actions/comments'

interface Comment {
    id: string
    content: string
    createdAt: Date
    author: {
        id: string
        fullName: string | null
        role: string
    }
}

interface CommentThreadProps {
    proofId: string
    currentUserId: string
}

export function CommentThread({ proofId, currentUserId }: CommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    // Load comments on mount or when opened
    useEffect(() => {
        if (isOpen) {
            loadComments()
        }
    }, [isOpen, proofId])

    const loadComments = async () => {
        const res = await getComments(proofId)
        if (res.success && res.comments) {
            setComments(res.comments)
        }
    }

    const handleSubmit = async () => {
        if (!newComment.trim()) return

        setLoading(true)
        // Optimistic update
        const tempId = Math.random().toString()
        const optimisticComment: Comment = {
            id: tempId,
            content: newComment,
            createdAt: new Date(),
            author: { id: currentUserId, fullName: 'Moi', role: 'user' } // Placeholder
        }

        // We rely on server response for real author details usually, but for now append
        setComments(prev => [...prev, optimisticComment])
        setNewComment('')

        const res = await addComment(proofId, newComment)
        if (res.success && res.comment) {
            // Replace optimistic with real one
            const serverComment = res.comment as unknown as Comment
            setComments(prev => prev.map(c => c.id === tempId ? serverComment : c))
        } else {
            // Revert on error
            setComments(prev => prev.filter(c => c.id !== tempId))
        }
        setLoading(false)
    }

    if (!isOpen) {
        return (
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="text-indigo-600 hover:bg-indigo-50">
                <MessageSquare className="w-4 h-4 mr-2" />
                Discuter ({comments.length > 0 ? comments.length : '0'})
            </Button>
        )
    }

    return (
        <div className="mt-4 border-t border-slate-100 pt-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-700">Fiche Navette</h4>
                <Button variant="ghost" size="xs" onClick={() => setIsOpen(false)} className="h-6 text-xs text-slate-400">Masquer</Button>
            </div>

            <div className="h-[200px] w-full rounded-md border p-4 bg-slate-50 mb-4 overflow-auto no-scrollbar">
                {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">Aucun échange pour le moment.</p>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const isMe = comment.author.id === currentUserId
                            return (
                                <div key={comment.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                                        }`}>
                                        <p>{comment.content}</p>
                                        <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {comment.author.fullName} • {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <Textarea
                    placeholder="Posez une question ou répondez..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[40px] resize-none text-sm"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmit()
                        }
                    }}
                />
                <Button size="icon" onClick={handleSubmit} disabled={loading || !newComment.trim()} className="h-auto bg-indigo-600 hover:bg-indigo-700">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
