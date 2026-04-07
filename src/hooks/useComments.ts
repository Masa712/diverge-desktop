// Stub for Phase 1 — comments feature will be implemented in Phase 2
export function useComments(_params: { nodeId?: string; sessionId?: string } | string | undefined) {
  return {
    comments: [] as any[],
    loading: false,
    isLoading: false,
    addComment: async (_content: string) => null,
    createComment: async (_params: { nodeId: string; sessionId: string; content: string }) => null,
    deleteComment: async (_commentId: string) => {},
    refetch: async () => {},
  }
}
