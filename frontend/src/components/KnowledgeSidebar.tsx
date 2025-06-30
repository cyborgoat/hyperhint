"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Menu, FileText, RefreshCw, Database, Server, Brain, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { remark } from 'remark';
import remarkHtml from 'remark-html';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface FileItem {
  id: string;
  label: string;
  description: string;
  name?: string;
  path?: string;
  type?: 'file' | 'directory' | 'folder' | 'image';
  children?: FileItem[];
  metadata?: {
    type?: string;
    path?: string;
    size?: number;
  };
}

interface SystemStats {
  short_term_memory: {
    total_items: number;
    files: number;
    folders: number;
    images: number;
  };
  long_term_memory: {
    total_actions: number;
  };
  llm_services: {
    default_model: string;
    all_models: unknown[];
    services: Record<string, {
      available: boolean;
      status: string;
      models: string[];
    }>;
  };
}

interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  available: boolean;
  status: string;
  models?: string[];
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  size?: number;
}

export default function KnowledgeSidebar() {
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [services, setServices] = useState<Record<string, ServiceInfo>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isDarkMode] = useState(true); // You can connect this to your theme system

  const buildFileTree = (files: FileItem[]): TreeNode[] => {
    const tree: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    // Sort files by path to ensure proper hierarchy
    const sortedFiles = [...files].sort((a, b) => {
      const pathA = a.metadata?.path || a.description.replace('File: ', '').replace('Folder: ', '');
      const pathB = b.metadata?.path || b.description.replace('File: ', '').replace('Folder: ', '');
      return pathA.localeCompare(pathB);
    });

    sortedFiles.forEach(file => {
      const fullPath = file.metadata?.path || file.description.replace('File: ', '').replace('Folder: ', '');
      const pathParts = fullPath.split('/').filter(part => part.length > 0);
      
      let currentPath = '';
      let currentLevel = tree;
      
      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        let node = pathMap.get(currentPath);
        if (!node) {
          const isLast = index === pathParts.length - 1;
          node = {
            name: part,
            path: currentPath,
            type: isLast ? (file.type === 'directory' || file.type === 'folder' ? 'folder' : 'file') : 'folder',
            children: isLast && (file.type === 'directory' || file.type === 'folder') ? [] : undefined,
            size: file.metadata?.size
          };
          
          pathMap.set(currentPath, node);
          currentLevel.push(node);
        }
        
        if (node.type === 'folder' && !node.children) {
          node.children = [];
        }
        
        if (node.children) {
          currentLevel = node.children;
        }
      });
    });

    return tree;
  };

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/files`);
      if (response.ok) {
        const data = await response.json();
        const fileList = Array.isArray(data) ? data : [];
        setFileTree(buildFileTree(fileList));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setFileTree([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/services`);
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices({});
    }
  }, []);

  const handleFileClick = async (filePath: string, fileName: string) => {
    setSelectedFile(fileName);
    setIsLoadingContent(true);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const rawContent = await response.text();
        const parsedContent = parseFileContent(rawContent);
        setFileContent(parsedContent);
      } else {
        setFileContent('Error loading file content');
      }
    } catch (error) {
      console.error('Error fetching file content:', error);
      setFileContent('Error loading file content');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Helper function to properly parse JSON content and handle escaped characters
  const parseFileContent = (rawContent: string): string => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rawContent);
      if (typeof parsed === 'string') {
        // If it's a JSON string, parse it and handle escaped characters
        return parsed
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
      // If it's not a string, stringify it nicely
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, return as-is but still handle common escape sequences
      return rawContent
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  };

  const refreshKnowledge = async () => {
    setIsRefreshing(true);
    try {
      await fetch(`${BACKEND_URL}/api/refresh`, { method: 'POST' });
      await Promise.all([fetchFiles(), fetchStats()]);
    } catch (error) {
      console.error('Failed to refresh knowledge:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = level * 16;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(node.path)}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="justify-start px-2 w-full h-8 text-left hover:bg-gray-100"
                style={{ paddingLeft: `${paddingLeft + 8}px` }}
              >
                {isExpanded ? (
                  <ChevronDown className="mr-1 w-3 h-3" />
                ) : (
                  <ChevronRight className="mr-1 w-3 h-3" />
                )}
                {isExpanded ? (
                  <FolderOpen className="mr-2 w-4 h-4 text-blue-600" />
                ) : (
                  <Folder className="mr-2 w-4 h-4 text-blue-600" />
                )}
                <span className="text-xs font-medium truncate">{node.name}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {node.children?.map(child => renderTreeNode(child, level + 1))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    } else {
      return (
        <Button
          key={node.path}
          variant="ghost"
          className="justify-start px-2 w-full h-8 text-left hover:bg-gray-100"
          style={{ paddingLeft: `${paddingLeft + 24}px` }}
          onClick={() => {
            handleFileClick(node.path, node.name);
          }}
        >
          <FileText className="mr-2 w-4 h-4 text-green-600" />
          <div className="flex flex-col flex-1 items-start min-w-0">
            <span className="text-xs font-medium truncate">{node.name}</span>
            {node.size && (
              <span className="text-xs text-muted-foreground">
                {(node.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
        </Button>
      );
    }
  };

  // Helper function to get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // Helper function to get language for syntax highlighting
  const getLanguageFromExtension = (extension: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
    };
    return languageMap[extension] || 'text';
  };

  // Render markdown content
  const renderMarkdown = async (content: string): Promise<string> => {
    const result = await remark()
      .use(remarkGfm)
      .use(remarkBreaks)
      .use(remarkHtml, { sanitize: false })
      .process(content);
    return result.toString();
  };

  // File content component
  const FileContentRenderer: React.FC<{ content: string; filename: string }> = ({ content, filename }) => {
    const [renderedContent, setRenderedContent] = useState<string>('');
    const extension = getFileExtension(filename);
    const isMarkdown = extension === 'md' || extension === 'markdown';
    const isCode = ['js', 'jsx', 'ts', 'tsx', 'py', 'json', 'html', 'css', 'scss', 'sass', 'yml', 'yaml', 'xml', 'sql', 'sh', 'bash', 'zsh', 'fish', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp'].includes(extension);

    useEffect(() => {
      if (isMarkdown) {
        renderMarkdown(content).then(setRenderedContent);
      }
    }, [content, isMarkdown]);

    if (isMarkdown) {
      return (
        <div 
          className="max-w-none prose prose-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      );
    }

    if (isCode) {
      const language = getLanguageFromExtension(extension);
      return (
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
          wrapLongLines={true}
        >
          {content}
        </SyntaxHighlighter>
      );
    }

    // For plain text files
    return (
      <pre className="overflow-auto p-4 font-mono text-sm whitespace-pre-wrap rounded-md bg-muted">
        {content}
      </pre>
    );
  };

  useEffect(() => {
    fetchFiles();
    fetchStats();
    fetchServices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchServices();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchFiles, fetchStats, fetchServices]);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="w-9 h-9">
            <Menu className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="p-0 w-80">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex gap-2 items-center">
              <Database className="w-5 h-5" />
              Knowledge Base
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)] px-4">
            {/* System Statistics */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="flex gap-2 items-center text-sm font-medium">
                  <Server className="w-4 h-4" />
                  System Status
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshKnowledge}
                  disabled={isRefreshing}
                  className="p-0 w-6 h-6"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {stats && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Files:</span>
                    <Badge variant="secondary" className="ml-1">
                      {stats.short_term_memory.files}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Folders:</span>
                    <Badge variant="secondary" className="ml-1">
                      {stats.short_term_memory.folders}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Actions:</span>
                    <Badge variant="secondary" className="ml-1">
                      {stats.long_term_memory.total_actions}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Models:</span>
                    <Badge variant="secondary" className="ml-1">
                      {stats.llm_services.all_models.length}
                    </Badge>
                  </div>
                  {stats.llm_services.default_model && (
                    <div className="col-span-2 mt-2 text-xs text-muted-foreground">
                      Default: <span className="font-mono">{stats.llm_services.default_model}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator className="mb-4" />

            {/* LLM Services Status */}
            <div className="mb-6">
              <h3 className="flex gap-2 items-center mb-3 text-sm font-medium">
                <Brain className="w-4 h-4" />
                LLM Services
              </h3>
              <div className="space-y-2">
                {Object.keys(services).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No services configured</p>
                ) : (
                  Object.entries(services).map(([serviceId, service]) => (
                    <div key={serviceId} className="flex justify-between items-center text-xs">
                      <span className="flex-1 mr-2 truncate">{service.name || serviceId}</span>
                      <div className="flex gap-1 items-center">
                        <span className={`text-xs ${service.available ? 'text-green-600' : 'text-red-600'}`}>
                          {service.available ? 'Online' : 'Offline'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${service.available ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Knowledge Files Tree */}
            <div>
              <h3 className="flex gap-2 items-center mb-3 text-sm font-medium">
                <FileText className="w-4 h-4" />
                Knowledge Files
              </h3>
              <div className="space-y-1">
                {fileTree.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files found</p>
                ) : (
                  fileTree.map(node => renderTreeNode(node))
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* File Content Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-6xl w-[90vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              <FileText className="w-4 h-4" />
              {selectedFile}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden flex-1">
            <ScrollArea className="h-[calc(90vh-120px)] w-full">
              <div className="p-6">
                {isLoadingContent ? (
                  <div className="flex justify-center items-center py-8">
                    <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
                    Loading file content...
                  </div>
                ) : (
                  <FileContentRenderer content={fileContent} filename={selectedFile || ''} />
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 