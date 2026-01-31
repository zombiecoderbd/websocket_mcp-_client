"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play,
  Save,
  Download,
  Upload,
  Copy,
  RotateCcw,
  Settings,
  FileText,
  Code,
  Database,
  Server,
  Bot
} from "lucide-react";

export default function DynamicEditorPage() {
  const [code, setCode] = useState<string>("# Welcome to ZombieCoder Editor\nprint('Hello, World!')\n");
  const [language, setLanguage] = useState<string>("python");
  const [fileName, setFileName] = useState<string>("main.py");
  const [theme, setTheme] = useState<string>("vs-dark");
  const [fontSize, setFontSize] = useState<number>(14);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recentFiles, setRecentFiles] = useState<string[]>([
    "main.py",
    "utils.js",
    "config.json"
  ]);
  const [activeTab, setActiveTab] = useState<string>("editor");
  const [output, setOutput] = useState<string>("# Output will appear here...");

  // Supported languages
  const languages = [
    { value: "python", label: "Python", icon: <Code className="h-4 w-4" /> },
    { value: "javascript", label: "JavaScript", icon: <Code className="h-4 w-4" /> },
    { value: "typescript", label: "TypeScript", icon: <Code className="h-4 w-4" /> },
    { value: "json", label: "JSON", icon: <Database className="h-4 w-4" /> },
    { value: "html", label: "HTML", icon: <FileText className="h-4 w-4" /> },
    { value: "css", label: "CSS", icon: <FileText className="h-4 w-4" /> },
    { value: "sql", label: "SQL", icon: <Database className="h-4 w-4" /> },
    { value: "shell", label: "Shell", icon: <Server className="h-4 w-4" /> },
  ];

  // Themes
  const themes = [
    { value: "vs", label: "Light" },
    { value: "vs-dark", label: "Dark" },
    { value: "hc-black", label: "High Contrast" },
  ];

  // Run code simulation
  const runCode = () => {
    setIsLoading(true);
    setOutput("# Running code...\n");
    
    setTimeout(() => {
      if (language === "python") {
        setOutput(`# Python Output:\nHello, World!\nCurrent time: ${new Date().toLocaleTimeString()}\nProcess completed successfully.`);
      } else if (language === "javascript") {
        setOutput(`// JavaScript Output:\nconsole.log("Hello, World!");\nExecution time: ${new Date().toLocaleTimeString()}`);
      } else {
        setOutput(`// ${language.toUpperCase()} Output:\nRunning ${fileName}...\nCompleted at ${new Date().toLocaleTimeString()}`);
      }
      setIsLoading(false);
    }, 1500);
  };

  // Save file
  const saveFile = () => {
    alert(`File "${fileName}" saved successfully!`);
    // In a real app, you would save to a database or file system
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    alert("Code copied to clipboard!");
  };

  // Load a recent file
  const loadFile = (file: string) => {
    setFileName(file);
    setCode(`# Content of ${file}\n# This is a sample content for demonstration purposes\n\n`);
    
    // Set language based on file extension
    if (file.endsWith('.py')) setLanguage('python');
    else if (file.endsWith('.js')) setLanguage('javascript');
    else if (file.endsWith('.ts')) setLanguage('typescript');
    else if (file.endsWith('.json')) setLanguage('json');
    else if (file.endsWith('.html')) setLanguage('html');
    else if (file.endsWith('.css')) setLanguage('css');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Code className="h-8 w-8 text-blue-500" />
            ZombieCoder Dynamic Editor
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced code editor with real-time collaboration and AI assistance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={saveFile} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={copyToClipboard} variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={runCode} disabled={isLoading}>
            {isLoading ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Editor Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">File Name</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <div className="flex items-center gap-2">
                        {lang.icon}
                        {lang.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Theme</label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Font Size: {fontSize}px</label>
              <Input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Code Editor
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={activeTab === "editor" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveTab("editor")}
                >
                  Editor
                </Button>
                <Button 
                  variant={activeTab === "output" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setActiveTab("output")}
                >
                  Output
                </Button>
              </div>
            </div>
            <CardDescription>
              Write and execute code in real-time with syntax highlighting
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === "editor" ? (
              <div className="border rounded-lg overflow-hidden h-[500px]">
                <Textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono resize-none h-full p-4"
                  spellCheck="false"
                />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden h-[500px] bg-black text-green-400 p-4 font-mono text-sm">
                <pre>{output}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Recent Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => loadFile(file)}
                >
                  <div className="flex items-center gap-2">
                    {file.endsWith('.py') ? <Code className="h-4 w-4" /> : 
                     file.endsWith('.js') ? <Code className="h-4 w-4" /> : 
                     file.endsWith('.json') ? <Database className="h-4 w-4" /> : 
                     <FileText className="h-4 w-4" />}
                    <span>{file}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">MCP Connection Status</h4>
                <div className="flex items-center gap-2 text-green-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected to ZombieCoder MCP Server</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <Bot className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
                <Button variant="outline" className="justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  DB Sync
                </Button>
                <Button variant="outline" className="justify-start">
                  <Server className="h-4 w-4 mr-2" />
                  Deploy
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}