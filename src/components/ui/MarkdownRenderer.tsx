'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import { Copy, Check } from 'lucide-react'
import 'highlight.js/styles/github-dark.css'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(codeId)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          // Custom code block with copy button
          pre: ({ node, children, ...props }) => {
            const codeElement = React.Children.toArray(children)[0]
            const codeContent = React.isValidElement(codeElement) 
              ? (codeElement.props.children as string) 
              : ''
            const codeId = `code-${Math.random().toString(36).substring(2, 11)}`
            
            return (
              <div className="relative group">
                <pre {...props} className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                  {children}
                </pre>
                <button
                  onClick={() => copyToClipboard(codeContent, codeId)}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title="Copy code"
                >
                  {copiedCode === codeId ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
            )
          },
          // Custom inline code styling
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className?.includes('language-')
            if (isInline) {
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          // Custom link styling
          a: ({ node, children, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // Custom blockquote styling
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg my-4 italic text-gray-700"
            >
              {children}
            </blockquote>
          ),
          // Custom table styling
          table: ({ node, children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          th: ({ node, children, ...props }) => (
            <th
              {...props}
              className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold"
            >
              {children}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td {...props} className="border border-gray-300 px-4 py-2">
              {children}
            </td>
          ),
          // Custom heading styling
          h1: ({ node, children, ...props }) => (
            <h1 {...props} className="text-2xl font-bold mb-4 mt-6 text-gray-900">
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 {...props} className="text-xl font-bold mb-3 mt-5 text-gray-900">
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 {...props} className="text-lg font-semibold mb-2 mt-4 text-gray-900">
              {children}
            </h3>
          ),
          // Custom list styling
          ul: ({ node, children, ...props }) => (
            <ul {...props} className="list-disc my-3 space-y-1 pl-6">
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol {...props} className="list-decimal my-3 space-y-1 pl-6">
              {children}
            </ol>
          ),
          li: ({ node, children, ...props }) => (
            <li {...props} className="text-gray-700">
              {children}
            </li>
          ),
          // Custom paragraph styling
          p: ({ node, children, ...props }) => (
            <p {...props} className="mb-3 text-gray-700 leading-relaxed">
              {children}
            </p>
          )
        }}
      >
        {content}
      </ReactMarkdown>
      
      <style jsx global>{`
        .markdown-content {
          line-height: 1.6;
        }
        
        .markdown-content pre {
          margin: 1rem 0;
        }
        
        .markdown-content code {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        }
        
        /* Highlight.js theme adjustments */
        .markdown-content .hljs {
          background: #1f2937 !important;
          color: #f3f4f6 !important;
        }
        
        /* Math rendering styles */
        .markdown-content .katex {
          font-size: 1em;
        }
        
        .markdown-content .katex-display {
          margin: 1em 0;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
