import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // 3. Get URL
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemoveImage) onRemoveImage();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900 p-2 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate">
            <img
              src={preview}
              alt="Slip Preview"
              className="w-14 h-14 object-cover rounded-lg border border-slate-700"
            />
            <div className="truncate">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Slip Attached
              </span>
              <p className="text-[11px] text-slate-400 truncate">Ready with collection entry</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-600 text-slate-300 text-sm font-medium transition-all active:scale-[0.99]"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Compressing & Uploading...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Attach Slip Photo (Optional)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
