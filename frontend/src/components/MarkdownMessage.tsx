"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// Import highlight.js CSS for syntax highlighting
import 'highlight.js/styles/atom-one-dark.css';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export default function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:mb-2 prose-pre:bg-muted prose-code:bg-muted ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom styling for code blocks
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <code className={`${className} block bg-muted p-4 rounded-lg overflow-x-auto text-sm`} {...props}>
                {children}
              </code>
            ) : (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          // Custom styling for pre blocks
          pre({ children, ...props }) {
            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto" {...props}>
                {children}
              </pre>
            );
          },
          // Custom styling for paragraphs
          p({ children, ...props }) {
            return (
              <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
                {children}
              </p>
            );
          },
          // Custom styling for headings
          h1({ children, ...props }) {
            return (
              <h1 className="text-xl font-bold mb-4 mt-6 first:mt-0" {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            return (
              <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0" {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0" {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }) {
            return (
              <h4 className="text-sm font-semibold mb-2 mt-3 first:mt-0" {...props}>
                {children}
              </h4>
            );
          },
          // Custom styling for lists
          ul({ children, ...props }) {
            return (
              <ul className="list-disc list-inside mb-3 space-y-1" {...props}>
                {children}
              </ul>
            );
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal list-inside mb-3 space-y-1" {...props}>
                {children}
              </ol>
            );
          },
          li({ children, ...props }) {
            return (
              <li className="text-sm leading-relaxed" {...props}>
                {children}
              </li>
            );
          },
          // Custom styling for blockquotes
          blockquote({ children, ...props }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic mb-3" {...props}>
                {children}
              </blockquote>
            );
          },
          // Custom styling for tables
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto mb-3">
                <table className="min-w-full border border-muted" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }) {
            return (
              <th className="border border-muted bg-muted/50 px-3 py-2 text-left font-semibold text-sm" {...props}>
                {children}
              </th>
            );
          },
          td({ children, ...props }) {
            return (
              <td className="border border-muted px-3 py-2 text-sm" {...props}>
                {children}
              </td>
            );
          },
          // Custom styling for horizontal rules
          hr({ ...props }) {
            return (
              <hr className="border-muted my-4" {...props} />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 