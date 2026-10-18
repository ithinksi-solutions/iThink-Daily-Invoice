import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ImageCaptureProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string | null;
  onRemoveImage?: () => void;
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({
  onImageUploaded,
  currentImageUrl,
  onRemoveImage,
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Client-side canvas compression function
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('Failed to get canvas context');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject('Canvas blob creation failed');
            },
            'image/jpeg',
            0.82
          );
        };
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      // 1. Compress image
      const compressedBlob = await compressImage(file);
      
      // 2. Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_slip.jpg`;
      const { data, error } = await supabase.storage
        .from('bill-slips')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Storage upload error:', error);
        alert('Failed to upload slip image: ' + error.message);
        setUploading(false);
        return;
      }

      // 3. Get Public URL
      const { data: urlData } = supabase.storage
        .from('bill-slips')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setPreview(publicUrl);
      onImageUploaded(publicUrl);
    } catch (err) {
      console.error('Image compression/upload failed:', err);
      alert('Error uploading image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (onRemoveImage) onRemoveImage();
  };

  return (
    <div className="w-full">
      {/* Hidden inputs: Camera (environment capture) vs Gallery (file picker) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-900/90 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <img
              src={preview}
              alt="Slip Preview"
              className="w-14 h-14 object-cover rounded-xl border border-slate-700 shrink-0"
            />
            <div className="truncate">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Slip Photo Attached
              </span>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">Uploaded & linked to collection</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 ml-2"
            title="Remove Slip"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* Camera Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="p-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Camera className="w-4 h-4 text-emerald-400" />
            )}
            <span>Camera Photo</span>
          </button>

          {/* Gallery / File Upload Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => galleryInputRef.current?.click()}
            className="p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            ) : (
              <Upload className="w-4 h-4 text-teal-400" />
            )}
            <span>Upload File</span>
          </button>
        </div>
      )}
    </div>
  );
};
