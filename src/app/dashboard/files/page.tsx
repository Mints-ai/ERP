"use client";

import { useState, useEffect, useRef } from "react";
import { storage } from "@/lib/firebase";
import { ref, listAll, getDownloadURL, uploadBytesResumable, deleteObject, getMetadata } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Image as ImageIcon, File, FileArchive, FileAudio, FileVideo, Upload, Trash2, Download, MoreVertical, Loader2, Cloud, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StorageFile {
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

// IndexedDB Helper functions for persistent, 100% free browser-based storage
const openLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    const request = indexedDB.open("MintsLocalDrive", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getLocalFiles = async (): Promise<StorageFile[]> => {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readonly");
    const store = transaction.objectStore("files");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

const saveLocalFile = async (file: StorageFile): Promise<void> => {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const request = store.put(file);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteLocalFile = async (path: string): Promise<void> => {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const request = store.delete(path);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function CloudDrive() {
  const { user } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [driveMode, setDriveMode] = useState<'cloud' | 'local'>('cloud');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (mode: 'cloud' | 'local' = driveMode) => {
    setLoading(true);
    setErrorMsg(null);

    if (mode === 'local') {
      try {
        const fetchedFiles = await getLocalFiles();
        fetchedFiles.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
        setFiles(fetchedFiles);
      } catch (err: any) {
        console.error("Local fetch failed:", err);
        setErrorMsg(err.message || "Failed to load local browser files.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const storageRef = ref(storage, 'agency-assets');
      const result = await listAll(storageRef);
      
      const filePromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        
        return {
          name: itemRef.name,
          url,
          path: itemRef.fullPath,
          size: metadata.size,
          contentType: metadata.contentType || "application/octet-stream",
          timeCreated: metadata.timeCreated
        };
      });

      const fetchedFiles = await Promise.all(filePromises);
      fetchedFiles.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
      setFiles(fetchedFiles);
    } catch (error: any) {
      console.error("Error fetching cloud files, falling back to Local Drive:", error);
      // Auto fallback to free Local browser drive
      setDriveMode('local');
      fetchFiles('local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [driveMode]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    if (driveMode === 'local') {
      try {
        setUploadProgress(30);
        const base64Url = await fileToBase64(file);
        setUploadProgress(70);
        const localFile = {
          name: file.name,
          url: base64Url,
          path: `local-assets/${Date.now()}_${file.name}`,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          timeCreated: new Date().toISOString()
        };
        await saveLocalFile(localFile);
        setUploadProgress(100);
        setTimeout(async () => {
          setIsUploading(false);
          setUploadProgress(0);
          await fetchFiles('local');
        }, 500);
      } catch (error) {
        console.error("Local upload failed:", error);
        setIsUploading(false);
        alert("Upload failed.");
      }
      return;
    }

    setIsUploading(true);
    const storageRef = ref(storage, `agency-assets/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setIsUploading(false);
        alert("Upload failed.");
      },
      async () => {
        setIsUploading(false);
        setUploadProgress(0);
        await fetchFiles('cloud'); // Refresh list
      }
    );
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    
    if (driveMode === 'local') {
      try {
        await deleteLocalFile(filePath);
        await fetchFiles('local');
      } catch (error) {
        console.error("Error deleting local file:", error);
        alert("Failed to delete file.");
      }
      return;
    }

    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      await fetchFiles('cloud');
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('image')) return <ImageIcon className="h-10 w-10 text-indigo-500" />;
    if (contentType.includes('pdf')) return <FileText className="h-10 w-10 text-red-500" />;
    if (contentType.includes('zip') || contentType.includes('rar')) return <FileArchive className="h-10 w-10 text-amber-500" />;
    if (contentType.includes('video')) return <FileVideo className="h-10 w-10 text-blue-500" />;
    if (contentType.includes('audio')) return <FileAudio className="h-10 w-10 text-green-500" />;
    return <File className="h-10 w-10 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Drive</h1>
          <p className="text-muted-foreground mt-1">Manage agency assets, brand guidelines, and client files.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setDriveMode('cloud')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                driveMode === 'cloud'
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cloud className="w-3.5 h-3.5 mr-1.5" /> Firebase Cloud
            </button>
            <button
              onClick={() => setDriveMode('local')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-all ${
                driveMode === 'local'
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database className="w-3.5 h-3.5 mr-1.5" /> Free Local Drive
            </button>
          </div>

          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleUpload}
          />
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading {Math.round(uploadProgress)}%</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Upload File</>
            )}
          </Button>
        </div>
      </div>

      <Card className="glass-card min-h-[500px]">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {driveMode === 'cloud' ? (
              <Cloud className="h-5 w-5 text-indigo-600 animate-pulse" />
            ) : (
              <Database className="h-5 w-5 text-teal-600" />
            )}
            {driveMode === 'cloud' ? "agency-assets/ (Firebase)" : "browser-local-assets/ (100% Free Drive)"}
          </CardTitle>
          <Badge variant="secondary" className={driveMode === 'local' ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}>
            {driveMode === 'local' ? "Unlimited Free Browser Space" : "Firebase Storage"}
          </Badge>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
              <p>Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-slate-200 rounded-xl">
              {driveMode === 'cloud' ? <Cloud className="h-12 w-12 text-slate-300 mb-4" /> : <Database className="h-12 w-12 text-slate-300 mb-4" />}
              <p className="font-medium text-slate-900">This folder is empty</p>
              <p className="text-sm">Click Upload File to add assets.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence>
                {files.map((file, i) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    key={file.path}
                    className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col items-center text-center"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 hover:bg-slate-100 rounded-md">
                          <MoreVertical className="h-4 w-4 text-slate-600" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const link = document.createElement('a');
                            link.href = file.url;
                            link.download = file.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(file.path)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="h-20 w-full flex items-center justify-center mb-3">
                      {file.contentType.includes('image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.url} alt={file.name} className="h-full object-contain rounded-md" />
                      ) : (
                        getFileIcon(file.contentType)
                      )}
                    </div>
                    
                    <p className="font-semibold text-sm text-slate-900 truncate w-full" title={file.name}>
                      {file.name.includes('_') ? file.name.substring(file.name.indexOf('_') + 1) : file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{formatSize(file.size)}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

