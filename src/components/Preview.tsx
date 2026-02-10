import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import yaml from 'js-yaml';
import { ChevronDown, ChevronRight, Calendar, User, Tag, Layout, Copy, Check } from 'lucide-react';

interface PreviewProps {
  content: string;
  theme: 'light' | 'dark';
  scrollRatio?: number;
  fontSize: number;
}

const CodeBlock = ({ language, value, theme }: { language: string, value: string, theme: 'light' | 'dark' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-[var(--c-border)] my-4 bg-[var(--c-bg)] group">
      <button 
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 text-xs font-bold text-[var(--c-text-light)] bg-[var(--c-bg)] border border-[var(--c-border)] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:text-[var(--c-brand)] hover:border-[var(--c-brand)] shadow-sm flex items-center gap-1.5"
        title="Click to copy"
      >
        {copied ? (
          <>
            <Check size={12} />
            <span>COPIED</span>
          </>
        ) : (
          <>
            <span>{language.toUpperCase()}</span>
            <Copy size={12} />
          </>
        )}
      </button>
      <SyntaxHighlighter
        style={theme === 'dark' ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.9em' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export function Preview({ content, theme, scrollRatio, fontSize }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [parsedContent, setParsedContent] = useState('');
  const [frontMatter, setFrontMatter] = useState<Record<string, any>>({});
  const [showFrontMatter, setShowFrontMatter] = useState(true);

  useEffect(() => {
    try {
      // Custom Front Matter parsing
      const FRONT_MATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
      const match = content.trimStart().match(FRONT_MATTER_REGEX);
      
      let mdContent = content;
      let data: Record<string, any> = {};

      if (match) {
        try {
          const parsed = yaml.load(match[1]);
          if (typeof parsed === 'object' && parsed !== null) {
            data = parsed as Record<string, any>;
            // Extract content after front matter
            mdContent = content.trimStart().slice(match[0].length).trimStart();
          }
        } catch (e) {
          console.error('YAML parsing error:', e);
        }
      }
      
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
        <div className="mb-8 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg-light)] overflow-hidden text-[0.9em]">
          <div 
            className="flex items-center justify-between px-4 py-2 bg-[var(--c-bg-lighter)] cursor-pointer select-none border-b border-[var(--c-border)]"
            onClick={() => setShowFrontMatter(!showFrontMatter)}
          >
             <div className="flex items-center text-[0.85em] font-bold text-[var(--c-text-light)] uppercase tracking-wider">
                <Layout size={14} className="mr-2" />
                Front Matter
             </div>
             {showFrontMatter ? <ChevronDown size={16} className="text-[var(--c-text-light)]" /> : <ChevronRight size={16} className="text-[var(--c-text-light)]" />}
          </div>
          
          {showFrontMatter && (
            <div className="p-4 text-[1em] font-mono text-[var(--c-text)] space-y-3">
               {frontMatter.title && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">title:</span>
                       <span className="font-bold">{frontMatter.title}</span>
                   </div>
               )}
               {frontMatter.shortTitle && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">shortTitle:</span>
                       <span>{frontMatter.shortTitle}</span>
                   </div>
               )}
               {frontMatter.date && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">date:</span>
                       <div className="flex items-center">
                           <Calendar size={12} className="mr-1.5 opacity-70" />
                           <span>{String(frontMatter.date)}</span>
                       </div>
                   </div>
               )}
               {frontMatter.author && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">author:</span>
                       <div className="flex items-center">
                           <User size={12} className="mr-1.5 opacity-70" />
                           <span>{frontMatter.author}</span>
                       </div>
                   </div>
               )}
               {frontMatter.tags && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">tags:</span>
                       <div className="flex flex-wrap gap-1">
                           {(Array.isArray(frontMatter.tags) ? frontMatter.tags : [frontMatter.tags]).map((tag: any, i: number) => (
                               <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[0.85em] bg-[var(--c-brand-light)]/10 text-[var(--c-brand)] border border-[var(--c-brand-light)]/20">
                                   <Tag size={10} className="mr-1" />
                                   {String(tag)}
                               </span>
                           ))}
                       </div>
                   </div>
               )}
               {frontMatter.categories && (
                   <div className="flex items-start">
                       <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">categories:</span>
                       <div className="flex flex-wrap gap-1">
                           {(Array.isArray(frontMatter.categories) ? frontMatter.categories : [frontMatter.categories]).map((cat: any, i: number) => (
                               <span key={i} className="px-2 py-0.5 rounded text-[0.85em] bg-[var(--c-bg-lighter)] text-[var(--c-text)] border border-[var(--c-border)]">
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
                        <span className="w-32 flex-shrink-0 text-[var(--c-text-light)] select-none">{key}:</span>
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
              <CodeBlock 
                language={match[1]} 
                value={String(children).replace(/\n$/, '')} 
                theme={theme} 
              />
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
