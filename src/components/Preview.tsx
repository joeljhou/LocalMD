import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import matter from 'gray-matter';
import { ChevronDown, ChevronRight, Calendar, User, Tag, Layout } from 'lucide-react';

interface PreviewProps {
  content: string;
  theme: 'light' | 'dark';
  scrollRatio?: number;
  fontSize: number;
}

export function Preview({ content, theme, scrollRatio, fontSize }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parsedContent, setParsedContent] = useState('');
  const [frontMatter, setFrontMatter] = useState<Record<string, any>>({});
  const [showFrontMatter, setShowFrontMatter] = useState(true);

  useEffect(() => {
    try {
      // gray-matter requires --- to be at the very start, so trim leading whitespace
      const { content: mdContent, data } = matter(content.trimStart());
      
      // Normalize keys
      const normalizedData = { ...data };
      if (normalizedData.tag && !normalizedData.tags) {
        normalizedData.tags = normalizedData.tag;
        delete normalizedData.tag;
      }
      if (normalizedData.category && !normalizedData.categories) {
        normalizedData.categories = normalizedData.category;
        delete normalizedData.category;
      }

      setParsedContent(mdContent);
      setFrontMatter(normalizedData);
    } catch (e) {
      // Fallback if parsing fails
      setParsedContent(content);
      setFrontMatter({});
    }
  }, [content]);

  useEffect(() => {
    if (scrollRatio !== undefined && containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      const scrollTop = scrollRatio * (scrollHeight - clientHeight);
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'auto' });
    }
  }, [scrollRatio]);

  const hasFrontMatter = Object.keys(frontMatter).length > 0;

  return (
    <div 
      ref={containerRef}
      style={{ fontSize: `${fontSize}px` }}
      className={`h-full overflow-y-auto px-8 py-6 prose max-w-none transition-colors duration-200
        ${theme === 'dark' ? 'prose-invert bg-[var(--c-bg)]' : 'bg-[var(--c-bg)]'}
        prose-headings:font-bold prose-h1:text-[1.8em] prose-h2:text-[1.5em] prose-h3:text-[1.25em]
        prose-a:text-[var(--c-brand)] prose-a:no-underline hover:prose-a:underline
        prose-pre:bg-transparent prose-pre:p-0
        prose-img:rounded-lg prose-img:shadow-md
        prose-blockquote:border-l-4 prose-blockquote:border-[var(--c-brand)]
      `}
    >
      {hasFrontMatter && (
        <div className="mb-8 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg-light)] overflow-hidden text-sm">
          <div 
            className="flex items-center justify-between px-4 py-2 bg-[var(--c-bg-lighter)] cursor-pointer select-none border-b border-[var(--c-border)]"
            onClick={() => setShowFrontMatter(!showFrontMatter)}
          >
             <div className="flex items-center text-xs font-bold text-[var(--c-text-light)] uppercase tracking-wider">
                <Layout size={14} className="mr-2" />
                Front Matter
             </div>
             {showFrontMatter ? <ChevronDown size={16} className="text-[var(--c-text-light)]" /> : <ChevronRight size={16} className="text-[var(--c-text-light)]" />}
          </div>
          
          {showFrontMatter && (
            <div className="p-4 text-sm font-mono text-[var(--c-text)] space-y-3">
               {frontMatter.title && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">title:</span>
                       <span className="font-bold">{frontMatter.title}</span>
                   </div>
               )}
               {frontMatter.shortTitle && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">shortTitle:</span>
                       <span>{frontMatter.shortTitle}</span>
                   </div>
               )}
               {frontMatter.date && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">date:</span>
                       <div className="flex items-center">
                           <Calendar size={12} className="mr-1.5 opacity-70" />
                           <span>{String(frontMatter.date)}</span>
                       </div>
                   </div>
               )}
               {frontMatter.author && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">author:</span>
                       <div className="flex items-center">
                           <User size={12} className="mr-1.5 opacity-70" />
                           <span>{frontMatter.author}</span>
                       </div>
                   </div>
               )}
               {frontMatter.tags && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">tags:</span>
                       <div className="flex flex-wrap gap-1">
                           {(Array.isArray(frontMatter.tags) ? frontMatter.tags : [frontMatter.tags]).map((tag: any, i: number) => (
                               <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[var(--c-brand-light)]/10 text-[var(--c-brand)] border border-[var(--c-brand-light)]/20">
                                   <Tag size={10} className="mr-1" />
                                   {String(tag)}
                               </span>
                           ))}
                       </div>
                   </div>
               )}
               {frontMatter.categories && (
                   <div className="flex items-start">
                       <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">categories:</span>
                       <div className="flex flex-wrap gap-1">
                           {(Array.isArray(frontMatter.categories) ? frontMatter.categories : [frontMatter.categories]).map((cat: any, i: number) => (
                               <span key={i} className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-[var(--c-text)] border border-[var(--c-border)]">
                                   {String(cat)}
                               </span>
                           ))}
                       </div>
                   </div>
               )}
               
               {/* Render other fields generically */}
               {Object.entries(frontMatter)
                  .filter(([key]) => !['title', 'shortTitle', 'date', 'author', 'tags', 'categories'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex items-start">
                        <span className="w-24 flex-shrink-0 text-[var(--c-text-light)]">{key}:</span>
                        <div className="whitespace-pre-wrap break-all text-[var(--c-text-light)]">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={theme === 'dark' ? oneDark : oneLight}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
}
