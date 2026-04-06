// Comment system types for multi-user collaboration

export interface NodeComment {
  id: string
  node_id: string
  session_id: string
  user_id: string
  content: string
  comment_type: 'user_comment' | 'system_note' | 'evaluation_feedback'
  parent_comment_id?: string
  version: number
  is_edited: boolean
  edit_history?: CommentEditHistory[]
  mentions?: string[]
  reactions?: Record<string, string[]> // emoji -> user_ids
  is_pinned: boolean
  is_resolved: boolean
  metadata?: Record<string, any>
  created_at: Date
  updated_at: Date
  
  // Joined data
  user_profiles?: UserProfile
  replies?: NodeComment[]
}

export interface CommentEditHistory {
  version: number
  content: string
  edited_at: string
  edited_by: string
}

export interface UserProfile {
  id: string
  display_name?: string
  avatar_url?: string
  bio?: string
  preferences?: Record<string, any>
}

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer' | 'commenter'
  permissions: {
    can_comment: boolean
    can_edit_nodes: boolean
    can_invite: boolean
    can_delete?: boolean
  }
  joined_at: Date
  last_active_at: Date
  is_active: boolean
  invitation_status: 'invited' | 'accepted' | 'declined'
  invited_by?: string
  
  // Joined data
  user_profiles?: UserProfile
}

export interface CommentReaction {
  id: string
  comment_id: string
  user_id: string
  reaction: string
  created_at: Date
}

// API request/response types
export interface CreateCommentRequest {
  nodeId: string
  sessionId: string
  content: string
  commentType?: 'user_comment' | 'system_note' | 'evaluation_feedback'
  parentCommentId?: string
}

export interface UpdateCommentRequest {
  commentId: string
  content?: string
  isPinned?: boolean
  isResolved?: boolean
}

export interface GetCommentsParams {
  nodeId?: string
  sessionId?: string
  limit?: number
  offset?: number
  includeReplies?: boolean
}

export interface CommentApiResponse {
  success: boolean
  data?: {
    comment?: NodeComment
    comments?: NodeComment[]
    message?: string
  }
  error?: string
}

// UI state types
export interface CommentUIState {
  isLoading: boolean
  isSubmitting: boolean
  editingCommentId?: string
  replyingToCommentId?: string
  showResolved: boolean
  sortBy: 'newest' | 'oldest' | 'pinned'
}

// Hook return types
export interface UseCommentsReturn {
  comments: NodeComment[]
  loading: boolean
  error?: string
  createComment: (data: CreateCommentRequest) => Promise<NodeComment | null>
  updateComment: (data: UpdateCommentRequest) => Promise<NodeComment | null>
  deleteComment: (commentId: string) => Promise<boolean>
  refetch: () => Promise<void>
}