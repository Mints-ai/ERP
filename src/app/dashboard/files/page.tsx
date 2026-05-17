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
import { FileText, Image as ImageIcon, File, FileArchive, FileAudio, FileVideo, Upload, Trash2, Download, MoreVertical, Loader2, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StorageFile {
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
  timeCreated: string;
}

export default function CloudDrive() {
  const { user } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setErrorMsg(null);
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
      // Sort newest first
      fetchedFiles.sort((a, b) => new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime());
      setFiles(fetchedFiles);
    } catch (error: any) {
      console.error("Error fetching files:", error);
      setErrorMsg(error.message || "Failed to load files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        await fetchFiles(); // Refresh list
      }
    );
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      await fetchFiles();
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
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5 text-indigo-600" />
            agency-assets/
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
              <p>Loading files from cloud...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center h-80">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 shadow-sm animate-pulse">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Firebase Storage Connection Needed</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Could not connect to cloud storage. This usually happens if the Storage service isn't activated yet or if the bucket URL is wrong.
              </p>
              <ul className="text-xs text-left text-slate-600 mt-3 space-y-1.5 list-disc pl-5">
                <li>Ensure <strong>Storage</strong> is enabled in your Firebase Console.</li>
                <li>Ensure rules are set to public/readable.</li>
                <li>Try changing the bucket in <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">mintserp.appspot.com</code>.</li>
              </ul>
              <Button onClick={fetchFiles} variant="outline" className="mt-6 border-slate-200 hover:bg-slate-50 h-9">
                Retry Connection
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-slate-200 rounded-xl">
              <Cloud className="h-12 w-12 text-slate-300 mb-4" />
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
                          <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
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
                      {/* Strip timestamp prefix from display name */}
                      {file.name.substring(file.name.indexOf('_') + 1)}
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
